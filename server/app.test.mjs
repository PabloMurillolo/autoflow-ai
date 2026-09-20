import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, provisionOwner, prune } from "./database.mjs";
import { createApp } from "./app.mjs";
const origin = "https://autoflow.test";
let db, app, cookie, csrf, otherCookie, otherCsrf, leadId;
let time = Date.parse("2026-09-19T12:00:00Z");
const good = {
  name: "Test Person",
  contact: "test@example.com",
  vehicle: "2020 Honda Accord",
  service: "brakes",
  notes: "Test only",
  language: "es",
  date: "2026-10-01",
  time: "Morning",
  consent: true,
};
async function call(
  path,
  { method = "GET", body, headers = {}, ip = "test" } = {},
) {
  return app(
    new Request(origin + path, {
      method,
      headers: { origin, "content-type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    { ip },
  );
}
async function login(shop, email = "owner@example.com") {
  const response = await call("/api/login", {
    method: "POST",
    body: { shop, email, password: "test-only-long-password" },
  });
  assert.equal(response.status, 200);
  return {
    cookie: response.headers.get("set-cookie").split(";")[0],
    csrf: (await response.json()).csrf,
  };
}
before(async () => {
  db = openDatabase(":memory:");
  await provisionOwner(db, {
    slug: "miami-auto-care",
    name: "Miami Auto Care",
    email: "owner@example.com",
    password: "test-only-long-password",
  });
  await provisionOwner(db, {
    slug: "other-shop",
    name: "Other Shop",
    email: "owner@example.com",
    password: "test-only-long-password",
  });
  app = await createApp({ db, origin, now: () => time });
  ({ cookie, csrf } = await login("miami-auto-care"));
  ({ cookie: otherCookie, csrf: otherCsrf } = await login("other-shop"));
});
after(() => db.close());
test("public config exposes shop name and retention, not credentials", async () => {
  const r = await call("/api/config");
  assert.deepEqual(await r.json(), {
    slug: "miami-auto-care",
    name: "Miami Auto Care",
    retentionDays: 90,
  });
});
test("unauthenticated callers cannot read leads, stats, or exports", async () => {
  for (const path of ["/api/leads", "/api/stats", "/api/leads/export"])
    assert.equal((await call(path)).status, 401);
});
test("invalid sign-in does not create a session", async () => {
  const r = await call("/api/login", {
    method: "POST",
    body: {
      shop: "miami-auto-care",
      email: "owner@example.com",
      password: "wrong",
    },
  });
  assert.equal(r.status, 401);
  assert.equal(r.headers.get("set-cookie"), null);
});
test("session cookies have Secure, HttpOnly, SameSite, expiry and a host prefix", async () => {
  const r = await call("/api/login", {
    method: "POST",
    body: {
      shop: "miami-auto-care",
      email: "owner@example.com",
      password: "test-only-long-password",
    },
  });
  const value = r.headers.get("set-cookie");
  for (const part of [
    "__Host-autoflow=",
    "Secure",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=28800",
    "Path=/",
  ])
    assert.ok(value.includes(part));
  const raw = value.split(";")[0].split("=")[1];
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE token_hash=?").get(raw)
      .n,
    0,
  );
});
test("cross-origin and missing-origin writes are rejected", async () => {
  for (const bad of ["https://evil.test", "null", ""])
    assert.equal(
      (
        await call("/api/login", {
          method: "POST",
          headers: { origin: bad },
          body: {},
        })
      ).status,
      403,
    );
});
test("server rejects invalid types, missing consent, invalid contact, and impossible dates", async () => {
  for (const patch of [
    { name: 1 },
    { consent: false },
    { contact: "bad" },
    { date: "2026-02-30" },
    { date: "2026-09-19" },
    { service: "arbitrary" },
  ]) {
    const r = await call("/api/shops/miami-auto-care/requests", {
      method: "POST",
      body: { ...good, ...patch },
      headers: { "idempotency-key": randomUUID() },
    });
    assert.equal(r.status, 400);
  }
});
test("intake saves a request once and ignores injected shop, owner, and status", async () => {
  const key = randomUUID(),
    params = {
      method: "POST",
      body: { ...good, shop_id: "other-shop", status: "Scheduled" },
      headers: { "idempotency-key": key },
    };
  const first = await call("/api/shops/miami-auto-care/requests", params);
  assert.equal(first.status, 201);
  const created = await first.json();
  leadId = created.id;
  assert.equal(created.status, "New");
  assert.equal(created.contact, undefined);
  const second = await call("/api/shops/miami-auto-care/requests", params);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).id, leadId);
  const mismatch = await call("/api/shops/miami-auto-care/requests", {
    ...params,
    body: { ...good, name: "Changed" },
  });
  assert.equal(mismatch.status, 409);
});
test("owner sees only their own leads and counts", async () => {
  const own = await (await call("/api/leads", { headers: { cookie } })).json();
  assert.equal(own.total, 1);
  assert.equal(own.items[0].contact, "test@example.com");
  const other = await (
    await call("/api/leads", { headers: { cookie: otherCookie } })
  ).json();
  assert.equal(other.total, 0);
  const stats = await (
    await call("/api/stats", { headers: { cookie: otherCookie } })
  ).json();
  assert.equal(stats.total, 0);
  assert.deepEqual(
    await (
      await call("/api/leads/export", { headers: { cookie: otherCookie } })
    ).json(),
    [],
  );
});
test("CSRF token is mandatory for owner mutations", async () => {
  assert.equal(
    (
      await call("/api/leads/" + leadId, {
        method: "PATCH",
        headers: { cookie },
        body: { status: "Contacted" },
      })
    ).status,
    403,
  );
});
test("another shop cannot mutate or delete a lead by guessing its ID", async () => {
  for (const method of ["PATCH", "DELETE"])
    assert.equal(
      (
        await call("/api/leads/" + leadId, {
          method,
          headers: { cookie: otherCookie, "x-csrf-token": otherCsrf },
          body: { status: "Contacted" },
        })
      ).status,
      404,
    );
});
test("owner updates status, searches and filters", async () => {
  const changed = await call("/api/leads/" + leadId, {
    method: "PATCH",
    headers: { cookie, "x-csrf-token": csrf },
    body: { status: "Contacted" },
  });
  assert.equal((await changed.json()).status, "Contacted");
  const found = await (
    await call("/api/leads?status=Contacted&q=Test", { headers: { cookie } })
  ).json();
  assert.equal(found.total, 1);
  assert.equal(
    (
      await (
        await call("/api/leads?status=New", { headers: { cookie } })
      ).json()
    ).total,
    0,
  );
});
test("owner deletion removes lead and associated idempotency record", async () => {
  const r = await call("/api/leads/" + leadId, {
    method: "DELETE",
    headers: { cookie, "x-csrf-token": csrf },
  });
  assert.equal(r.status, 200);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM requests").get().n, 0);
});
test("JSON body size is bounded", async () => {
  const r = await call("/api/shops/miami-auto-care/requests", {
    method: "POST",
    body: { ...good, notes: "x".repeat(17000) },
  });
  assert.equal(r.status, 413);
});
test("login rate limit is enforced", async () => {
  const limited = await createApp({ db, origin, loginLimit: 1 });
  const req = () =>
    new Request(origin + "/api/login", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ shop: "x", email: "x", password: "x" }),
    });
  assert.equal((await limited(req())).status, 401);
  assert.equal((await limited(req())).status, 429);
});
test("sessions expire and logout revokes the stored session", async () => {
  const current = await login("miami-auto-care");
  const r = await call("/api/logout", {
    method: "POST",
    headers: { cookie: current.cookie, "x-csrf-token": current.csrf },
    body: {},
  });
  assert.equal(r.status, 200);
  assert.equal(
    (await call("/api/session", { headers: { cookie: current.cookie } }))
      .status,
    401,
  );
  time += 28800001;
  assert.equal(
    (await call("/api/session", { headers: { cookie } })).status,
    401,
  );
});
test("lead records survive a database restart and retention removes expired records", async () => {
  const dir = mkdtempSync(join(tmpdir(), "autoflow-test-"));
  const file = join(dir, "db.sqlite");
  let disk;
  try {
    disk = openDatabase(file);
    const shop = await provisionOwner(disk, {
      slug: "disk-shop",
      name: "Disk Shop",
      email: "owner@example.com",
      password: "test-only-long-password",
    });
    disk
      .prepare("INSERT INTO leads VALUES(?,?,?,?,?,?)")
      .run(
        randomUUID(),
        shop.id,
        JSON.stringify(good),
        "New",
        "2020-01-01T00:00:00Z",
        "2020-01-01T00:00:00Z",
      );
    disk.close();
    disk = openDatabase(file);
    assert.equal(disk.prepare("SELECT COUNT(*) AS n FROM leads").get().n, 1);
    assert.equal(prune(disk, 90, time), 1);
  } finally {
    disk?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
