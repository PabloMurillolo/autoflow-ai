import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { openDatabase } from "./database.mjs";
import { createApp } from "./app.mjs";
process.umask(0o077);
const port = Number(process.env.PORT || 3000),
  host = process.env.HOST || "127.0.0.1";
const origin = process.env.APP_ORIGIN || `http://127.0.0.1:${port}`;
if (process.env.NODE_ENV === "production" && !origin.startsWith("https://"))
  throw new Error(
    "Production requires an HTTPS APP_ORIGIN behind a TLS reverse proxy.",
  );
const db = openDatabase(process.env.DATABASE_PATH);
const handle = await createApp({
  db,
  origin,
  defaultShop: process.env.DEFAULT_SHOP_SLUG || "miami-auto-care",
  retentionDays: Number(process.env.LEAD_RETENTION_DAYS || 90),
});
const root = resolve("dist-server");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
const security = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "Cache-Control": "no-store",
};
const server = createServer(async (req, res) => {
  try {
    for (const [k, v] of Object.entries(security)) res.setHeader(k, v);
    if (origin.startsWith("https:"))
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    const url = new URL(req.url, origin);
    if (url.pathname.startsWith("/api/")) {
      const length = Number(req.headers["content-length"] || 0);
      if (length > 16384) {
        res.writeHead(413);
        res.end("Request too large");
        return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 16384) {
          res.writeHead(413);
          res.end("Request too large");
          return;
        }
        chunks.push(chunk);
      }
      const request = new Request(url, {
        method: req.method,
        headers: req.headers,
        ...(!["GET", "HEAD"].includes(req.method)
          ? { body: Buffer.concat(chunks) }
          : {}),
      });
      // Use socket IP only. Never trust caller-controlled X-Forwarded-For.
      const response = await handle(request, {
        ip: req.socket.remoteAddress || "unknown",
      });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!file.startsWith(root + "/") || !types[extname(file)]) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    if (!(await stat(file)).isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.setHeader("Content-Type", types[extname(file)]);
    res.end(req.method === "HEAD" ? undefined : await readFile(file));
  } catch (error) {
    res.writeHead(error.code === "ENOENT" ? 404 : 400);
    res.end("Request could not be served");
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.maxRequestsPerSocket = 100;
server.listen(port, host, () =>
  console.log(`AutoFlow server listening on ${host}:${port}`),
);
function close() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
