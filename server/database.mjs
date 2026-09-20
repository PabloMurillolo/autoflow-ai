import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes, scrypt, timingSafeEqual, randomUUID } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64, options);
  return `${salt}:${key.toString("hex")}`;
}
export async function passwordMatches(password, encoded) {
  const [salt, hex] = encoded.split(":");
  const key = await derive(password, salt, 64, options);
  const expected = Buffer.from(hex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
export function openDatabase(filename = "./data/autoflow.sqlite") {
  if (filename !== ":memory:")
    mkdirSync(dirname(resolve(filename)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  if (filename !== ":memory:") chmodSync(filename, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA secure_delete=ON;
 CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY);
 CREATE TABLE IF NOT EXISTS shops(id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS owners(id TEXT PRIMARY KEY, shop_id TEXT NOT NULL REFERENCES shops(id), email TEXT NOT NULL, password_hash TEXT NOT NULL, UNIQUE(shop_id,email));
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY, shop_id TEXT NOT NULL REFERENCES shops(id), payload TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('New','Contacted','Scheduled')), created_at TEXT NOT NULL, consent_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS leads_shop_date ON leads(shop_id,created_at DESC,id DESC);
 CREATE TABLE IF NOT EXISTS requests(shop_id TEXT NOT NULL REFERENCES shops(id), request_key TEXT NOT NULL, payload_hash TEXT NOT NULL, lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE, PRIMARY KEY(shop_id,request_key));
 INSERT OR IGNORE INTO migrations VALUES(1);`);
  return db;
}
export async function provisionOwner(db, { slug, name, email, password }) {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 64 ||
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 160 ||
    typeof password !== "string" ||
    password.length < 14 ||
    password.length > 128
  )
    throw new Error(
      "Use a valid shop slug, name, email, and a 14–128 character password.",
    );
  const hash = await passwordHash(password);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT OR IGNORE INTO shops VALUES(?,?,?)").run(
      randomUUID(),
      slug,
      name.trim(),
    );
    const shop = db.prepare("SELECT * FROM shops WHERE slug=?").get(slug);
    const old = db
      .prepare("SELECT id FROM owners WHERE shop_id=? AND email=?")
      .get(shop.id, email.toLowerCase());
    if (old) {
      db.prepare("UPDATE owners SET password_hash=? WHERE id=?").run(
        hash,
        old.id,
      );
      db.prepare("DELETE FROM sessions WHERE owner_id=?").run(old.id);
    } else
      db.prepare("INSERT INTO owners VALUES(?,?,?,?)").run(
        randomUUID(),
        shop.id,
        email.toLowerCase(),
        hash,
      );
    db.exec("COMMIT");
    return shop;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function prune(db, retentionDays, now = Date.now()) {
  const cutoff = new Date(now - retentionDays * 86400000).toISOString();
  db.prepare("DELETE FROM sessions WHERE expires<=?").run(now);
  return db.prepare("DELETE FROM leads WHERE created_at<?").run(cutoff).changes;
}
export async function backupDatabase(db, destination) {
  await backup(db, destination);
  chmodSync(destination, 0o600);
}
