# v0.2 private workspace

AutoFlow now has an optional Node.js server with SQLite, owner authentication, and per-shop lead access. The public GitHub Pages site remains a browser-local portfolio demo. It cannot run the server or share real customer records.

## Run the private workspace locally

Use Node.js **24+**. Node's built-in SQLite and TypeScript stripping are used on the server; no database service is required.

```sh
npm ci
cp .env.example .env
```

Edit `.env` locally. Set `OWNER_EMAIL` to the owner account you want and `OWNER_PASSWORD` to a unique password of at least 14 characters. There is **no default account or password**. Keep the initial shop slug/name or replace both `SHOP_SLUG` and `DEFAULT_SHOP_SLUG` for your business. Do not commit `.env`.

```sh
npm run owner:setup
npm run build:server
npm start
```

Remove `OWNER_PASSWORD` from `.env` after provisioning. Open `http://127.0.0.1:3000/`. Submit a fictional request, then use **Owner sign-in** with the shop code and credentials you configured. The owner dashboard starts empty and never imports the public demo's browser data.

`npm run dev` still starts the static demo. To test server UI changes, rerun `npm run build:server` and refresh. Restart `npm start` after server-code changes. Use `npm run check` for both test suites and both builds.

## Accounts and shop isolation

The provisioning command creates a shop if necessary, then creates or updates that shop's owner account. Re-running it with the same shop/email rotates the password and revokes that owner's sessions. There is no self-service registration, email verification, recovery email, or MFA in this release. An operator must perform password recovery using the CLI.

To add a second shop, provision a different `SHOP_SLUG`, `SHOP_NAME`, email and password. Its public intake page is `/?shop=the-other-slug`. Sign-in requires that shop code. The server gets the authorized shop ID from the authenticated session, never from a client-provided owner/shop ID. The default public shop is configured by `DEFAULT_SHOP_SLUG`.

Sessions use random 256-bit tokens, stored only as SHA-256 hashes in SQLite. Cookies are HttpOnly and SameSite=Strict, with an eight-hour absolute expiry. HTTPS deployments use Secure cookies and the `__Host-` prefix. Local loopback HTTP uses a distinct development cookie. Passwords use salted scrypt with N=32768, r=8, p=1. A CSRF token is kept in UI memory; owner writes require it and an exact matching Origin. The API does not enable CORS.

## API

Every response has `Cache-Control: no-store`. Write requests require an exact matching `Origin: APP_ORIGIN`. JSON POST/PATCH bodies are limited to 16 KiB.

| Method | Route                           | Access / behavior                                                                   |
| ------ | ------------------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/api/health`                   | Public liveness/version; no data                                                    |
| GET    | `/api/config?shop=slug`         | Public shop name and retention notice                                               |
| POST   | `/api/shops/:slug/requests`     | Public validated intake; requires consent acknowledgment and `Idempotency-Key` UUID |
| POST   | `/api/login`                    | Shop code, email, password; sets session cookie                                     |
| GET    | `/api/session`                  | Owner session and CSRF token                                                        |
| POST   | `/api/logout`                   | Owner + CSRF; revokes session                                                       |
| GET    | `/api/leads?q=&status=&offset=` | Owner's leads; 50 per page, search by name/vehicle                                  |
| GET    | `/api/stats`                    | Owner's shop totals                                                                 |
| GET    | `/api/leads/export`             | Owner's complete JSON export                                                        |
| PATCH  | `/api/leads/:id`                | Owner + CSRF; update status only                                                    |
| DELETE | `/api/leads/:id`                | Owner + CSRF; delete from active database                                           |

The intake payload is `name`, `contact`, `vehicle`, `service`, `notes`, `language`, `date`, `time`, and `consent: true`. It cannot set ownership, timestamps, IDs, or status. The success response contains only a request reference, creation time, and initial status. It does not confirm a booking. The acknowledgment applies to handling this service request and is **not SMS or marketing opt-in**. The server records its timestamp with the lead.

Retries with the same idempotency key and same normalized payload return the original request reference. A changed payload with the same key returns 409. IDs are scoped to a shop. Deleted/expired leads also remove their idempotency records.

## Persistence, retention and backups

Schema version 1 creates `shops`, `owners`, `sessions`, `leads`, and `requests` tables and a migration marker. SQLite uses foreign keys, WAL, parameterized queries, a busy timeout, and secure deletion. Data files are created with owner-only permissions. The schema initializer is idempotent; future schema changes must add explicit versioned migrations.

`LEAD_RETENTION_DAYS` defaults to 90 (allowed range 7–3650). The server prunes expired sessions and old leads on the first API request and no more than once per hour thereafter. For cleanup without traffic, schedule `npm run data:prune` using your host's scheduler. The UI's retention notice follows this setting.

Owners can delete individual leads with an explicit confirmation. This removes the active row and its request-key row; it does not recall exports or erase old backup snapshots. WAL files, storage snapshots, exports, and backups need their own retention policy. SQLite is **not encrypted by this application**: use encrypted disks and properly controlled persistent volumes.

Set `BACKUP_PATH` to a new protected filename outside public directories, then run `npm run data:backup`. This uses SQLite's backup API for a consistent snapshot. To restore, stop the server, preserve the current database for rollback, restore the snapshot to `DATABASE_PATH`, and remove or isolate stale WAL/SHM files associated with the old database before restart. Test recovery on a separate instance first. Restrict access and expire backups; they contain customer data and password hashes.

## Deployment

A single Node process with a durable writable volume is the supported topology. Do not deploy this SQLite server to an ephemeral filesystem or run independent replicas against separate copies of the database. GitHub Pages only hosts `dist/`; the server serves **`dist-server/`** at the same origin as its API.

For a Node host:

- Install Node 24+, run `npm ci` and `npm run build:server`.
- Mount durable, access-controlled storage and set `DATABASE_PATH` to that volume.
- Set `APP_ORIGIN` to the exact public HTTPS origin (no trailing slash), `NODE_ENV=production`, and the host-required `HOST`/`PORT`.
- Terminate TLS at the host's reverse proxy; forward to the Node process. Production refuses an HTTP `APP_ORIGIN`.
- Provision the owner using a one-time secret, remove it, and start with `node server/index.mjs`.
- Run the local/browser and two-shop authorization checks against the deployment before collecting customer data.

A multi-stage `Dockerfile` is also included. It runs checks during the build, serves only the server bundle, and runs as the `node` user. Attach a persistent volume at `/app/data`. It is provided as a deployment template; the Docker image has not been runtime-tested in this environment.

## Operational limits

Login is limited per socket IP and shop/email (10 attempts / 15 minutes); intake is limited per socket IP (30/hour). Limits are in memory and reset on process restart. Password hashing concurrency is bounded. Behind a reverse proxy, requests share the proxy's socket IP; configure a trusted edge rate limiter for a real deployment. The server intentionally ignores spoofable forwarded IP headers. Distributed quotas, bot protection and Redis-backed limits are not implemented.

A shop can hold up to 10,000 active leads. Search is paginated; exports are bounded by that limit. Status updates use last-write-wins. Full audit history, optimistic concurrency, fine-grained owner roles, self-service identity, MFA, and operational alerting remain follow-up hardening work. The live LLM, calendar, SMS, CRM, and Higgsfield adapters are not connected.

Security references: [Node SQLite](https://nodejs.org/api/sqlite.html), [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
