import { createHash, randomBytes, randomUUID } from "node:crypto";
import { passwordHash, passwordMatches, prune } from "./database.mjs";
import { validateIntake } from "../src/domain.ts";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export async function createApp({
  db,
  origin = "http://127.0.0.1:3000",
  defaultShop = "miami-auto-care",
  retentionDays = 90,
  now = () => Date.now(),
  loginLimit = 10,
  intakeLimit = 30,
}) {
  const parsedOrigin = new URL(origin);
  if (
    parsedOrigin.origin !== origin ||
    (parsedOrigin.protocol !== "https:" &&
      !["127.0.0.1", "localhost", "[::1]"].includes(parsedOrigin.hostname))
  )
    throw new Error(
      "APP_ORIGIN must be an exact HTTPS origin (HTTP is only allowed on loopback).",
    );
  if (
    !Number.isInteger(retentionDays) ||
    retentionDays < 7 ||
    retentionDays > 3650
  )
    throw new Error("LEAD_RETENTION_DAYS must be 7–3650.");
  const secure = parsedOrigin.protocol === "https:";
  const cookieName = secure ? "__Host-autoflow" : "autoflow_local";
  const dummyHash = await passwordHash(randomBytes(32).toString("hex"));
  const buckets = new Map();
  let lastPrune = 0;
  let activeHashes = 0;
  function limit(key, maximum, windowMs) {
    const time = now();
    for (const [k, v] of buckets) if (v.until <= time) buckets.delete(k);
    let b = buckets.get(key);
    if (!b) {
      if (buckets.size >= 10000)
        throw new HttpError(429, "Please try again later.");
      b = { count: 0, until: time + windowMs };
      buckets.set(key, b);
    }
    if (++b.count > maximum)
      throw new HttpError(429, "Too many attempts. Please try again later.");
  }
  const cookie = (token, age = 28800) =>
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? "; Secure" : ""}`;
  function session(req) {
    const token = (req.headers.get("cookie") || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      throw new HttpError(401, "Sign in to continue.");
    const row = db
      .prepare(
        "SELECT s.*,o.shop_id,o.email,p.slug,p.name FROM sessions s JOIN owners o ON o.id=s.owner_id JOIN shops p ON p.id=o.shop_id WHERE token_hash=? AND expires>?",
      )
      .get(hash(token), now());
    if (!row) throw new HttpError(401, "Sign in to continue.");
    return row;
  }
  const publicSession = (s) => ({
    email: s.email,
    shopSlug: s.slug,
    shopName: s.name,
    csrf: s.csrf,
    expiresAt: s.expires,
  });
  async function body(req) {
    if (!(req.headers.get("content-type") || "").startsWith("application/json"))
      throw new HttpError(415, "JSON is required.");
    const text = await req.text();
    if (Buffer.byteLength(text) > 16384)
      throw new HttpError(413, "Request is too large.");
    try {
      const value = JSON.parse(text);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw 0;
      return value;
    } catch {
      throw new HttpError(400, "Invalid JSON object.");
    }
  }
  function ownerMutation(req) {
    const s = session(req);
    if (req.headers.get("x-csrf-token") !== s.csrf)
      throw new HttpError(403, "Refresh your session and try again.");
    return s;
  }
  function leadRow(row) {
    return {
      ...JSON.parse(row.payload),
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
    };
  }
  function shop(slug) {
    const s = db.prepare("SELECT * FROM shops WHERE slug=?").get(slug);
    if (!s) throw new HttpError(404, "Shop not found.");
    return s;
  }
  return async function handle(req, { ip = "local" } = {}) {
    try {
      if (now() - lastPrune > 3600000) {
        prune(db, retentionDays, now());
        lastPrune = now();
      }
      const url = new URL(req.url),
        path = url.pathname,
        method = req.method;
      if (!["GET", "POST", "PATCH", "DELETE"].includes(method))
        throw new HttpError(405, "Method not allowed.");
      // Reject every cross-origin write, including unauthenticated login/intake. No CORS headers.
      if (method !== "GET" && req.headers.get("origin") !== origin)
        throw new HttpError(403, "Request origin is not allowed.");
      if (path === "/api/health" && method === "GET")
        return json({ ok: true, version: "0.2.0" });
      if (path === "/api/config" && method === "GET") {
        const s = shop(url.searchParams.get("shop") || defaultShop);
        return json({ slug: s.slug, name: s.name, retentionDays });
      }
      if (path === "/api/login" && method === "POST") {
        limit("login-ip:" + ip, loginLimit, 900000);
        const b = await body(req);
        if (
          typeof b.email !== "string" ||
          b.email.length > 160 ||
          typeof b.password !== "string" ||
          b.password.length > 128 ||
          typeof b.shop !== "string" ||
          b.shop.length > 64
        )
          throw new HttpError(400, "Invalid sign-in details.");
        limit(
          "login-account:" + hash(b.shop + ":" + b.email.toLowerCase()),
          loginLimit,
          900000,
        );
        const o = db
          .prepare(
            "SELECT o.* FROM owners o JOIN shops p ON p.id=o.shop_id WHERE p.slug=? AND o.email=?",
          )
          .get(b.shop, b.email.toLowerCase());
        if (activeHashes >= 4)
          throw new HttpError(429, "Please try again later.");
        activeHashes++;
        let valid;
        try {
          valid = await passwordMatches(
            b.password,
            o?.password_hash || dummyHash,
          );
        } finally {
          activeHashes--;
        }
        if (!valid || !o)
          throw new HttpError(401, "Email, password, or shop is incorrect.");
        try {
          const old = session(req);
          db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
            old.token_hash,
          );
        } catch {
          /* No existing session. */
        }
        const token = randomBytes(32).toString("hex"),
          csrf = randomBytes(32).toString("hex");
        db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run(
          hash(token),
          o.id,
          csrf,
          now() + 28800000,
        );
        return json(
          publicSession(
            session(
              new Request(req.url, {
                headers: { cookie: `${cookieName}=${token}` },
              }),
            ),
          ),
          200,
          { "Set-Cookie": cookie(token) },
        );
      }
      if (path === "/api/session" && method === "GET")
        return json(publicSession(session(req)));
      if (path === "/api/logout" && method === "POST") {
        const s = ownerMutation(req);
        db.prepare("DELETE FROM sessions WHERE token_hash=?").run(s.token_hash);
        return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
      }
      const intake = path.match(/^\/api\/shops\/([a-z0-9-]+)\/requests$/);
      if (intake && method === "POST") {
        limit("intake-ip:" + ip, intakeLimit, 3600000);
        const s = shop(intake[1]);
        const b = await body(req);
        if (b.consent !== true)
          throw new HttpError(
            400,
            "Acknowledge the data notice before submitting.",
          );
        const fields = [
          "name",
          "contact",
          "vehicle",
          "service",
          "notes",
          "language",
          "date",
          "time",
        ];
        if (!fields.every((k) => typeof b[k] === "string"))
          throw new HttpError(400, "Complete all required fields.");
        const data = Object.fromEntries(fields.map((k) => [k, b[k].trim()]));
        const error = validateIntake(
          data,
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/New_York",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(now())),
        );
        if (error) throw new HttpError(400, `Check field: ${error}.`);
        const key = req.headers.get("idempotency-key");
        if (!key || !/^[a-f0-9-]{36}$/.test(key))
          throw new HttpError(400, "A request identifier is required.");
        const payload = JSON.stringify(data),
          digest = hash(payload);
        db.exec("BEGIN IMMEDIATE");
        try {
          const existing = db
            .prepare(
              "SELECT r.payload_hash,l.id,l.created_at FROM requests r JOIN leads l ON l.id=r.lead_id WHERE r.shop_id=? AND r.request_key=?",
            )
            .get(s.id, key);
          if (existing) {
            if (existing.payload_hash !== digest)
              throw new HttpError(
                409,
                "This request identifier was already used.",
              );
            db.exec("COMMIT");
            return json(
              {
                id: existing.id,
                createdAt: existing.created_at,
                status: "New",
              },
              200,
            );
          }
          if (
            db
              .prepare("SELECT COUNT(*) AS n FROM leads WHERE shop_id=?")
              .get(s.id).n >= 10000
          )
            throw new HttpError(
              503,
              "The shop cannot accept more requests right now.",
            );
          const id = randomUUID(),
            createdAt = new Date(now()).toISOString();
          db.prepare("INSERT INTO leads VALUES(?,?,?,?,?,?)").run(
            id,
            s.id,
            payload,
            "New",
            createdAt,
            createdAt,
          );
          db.prepare("INSERT INTO requests VALUES(?,?,?,?)").run(
            s.id,
            key,
            digest,
            id,
          );
          db.exec("COMMIT");
          return json({ id, createdAt, status: "New" }, 201);
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      }
      if (path === "/api/leads" && method === "GET") {
        const s = session(req),
          status = url.searchParams.get("status") || "",
          query = (url.searchParams.get("q") || "").slice(0, 100),
          offset = Number(url.searchParams.get("offset") || 0);
        if (
          !Number.isInteger(offset) ||
          offset < 0 ||
          offset > 10000 ||
          !["", "New", "Contacted", "Scheduled"].includes(status)
        )
          throw new HttpError(400, "Invalid filters.");
        const pattern = "%" + query.replace(/[\\%_]/g, "\\$&") + "%";
        const where =
          "shop_id=? AND (?='' OR status=?) AND (json_extract(payload,'$.name') LIKE ? ESCAPE '\\' OR json_extract(payload,'$.vehicle') LIKE ? ESCAPE '\\')";
        const args = [s.shop_id, status, status, pattern, pattern];
        const total = db
          .prepare("SELECT COUNT(*) AS n FROM leads WHERE " + where)
          .get(...args).n;
        const rows = db
          .prepare(
            "SELECT * FROM leads WHERE " +
              where +
              " ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET ?",
          )
          .all(...args, offset);
        return json({
          items: rows.map(leadRow),
          total,
          nextOffset: offset + 50 < total ? offset + 50 : null,
        });
      }
      if (path === "/api/stats" && method === "GET") {
        const s = session(req);
        const counts = db
          .prepare(
            "SELECT COUNT(*) AS total,COALESCE(SUM(status='New'),0) AS open,COALESCE(SUM(status='Scheduled'),0) AS scheduled,COALESCE(SUM(json_extract(payload,'$.language')='es'),0) AS spanish FROM leads WHERE shop_id=?",
          )
          .get(s.shop_id);
        return json(counts);
      }
      if (path === "/api/leads/export" && method === "GET") {
        const s = session(req);
        return json(
          db
            .prepare(
              "SELECT * FROM leads WHERE shop_id=? ORDER BY created_at DESC",
            )
            .all(s.shop_id)
            .map(leadRow),
          200,
          {
            "Content-Disposition": 'attachment; filename="autoflow-leads.json"',
          },
        );
      }
      const detail = path.match(/^\/api\/leads\/([a-f0-9-]{36})$/);
      if (detail && ["PATCH", "DELETE"].includes(method)) {
        const s = ownerMutation(req);
        const row = db
          .prepare("SELECT * FROM leads WHERE shop_id=? AND id=?")
          .get(s.shop_id, detail[1]);
        if (!row) throw new HttpError(404, "Lead not found.");
        if (method === "DELETE") {
          db.prepare("DELETE FROM leads WHERE shop_id=? AND id=?").run(
            s.shop_id,
            detail[1],
          );
          return json({ ok: true });
        }
        const b = await body(req);
        if (!["New", "Contacted", "Scheduled"].includes(b.status))
          throw new HttpError(400, "Invalid status.");
        db.prepare("UPDATE leads SET status=? WHERE shop_id=? AND id=?").run(
          b.status,
          s.shop_id,
          detail[1],
        );
        return json({ ...leadRow(row), status: b.status });
      }
      throw new HttpError(404, "Not found.");
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
      console.error("API operation failed:", error.code || error.name);
      return json(
        { error: "The request could not be completed. Please try again." },
        500,
      );
    }
  };
}
