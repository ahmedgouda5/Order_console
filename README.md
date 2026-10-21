# Orders Console — SARH Full Stack Take-Home

Monorepo containing a **React (Vite) frontend** (`apps/web`), a **Node/Express + Drizzle ORM/PostgreSQL backend** (`apps/api`), and a Docker Compose stack that wires them together with a real PostgreSQL 17 database. The database can be seeded with **50,000 orders** (each with **1–5 line items** and a total that is the sum of its line items).

| Service | Source | Host URL | Container port | Notes |
|---------|--------|----------|----------------|-------|
| Web (React/Vite dev server) | `apps/web` | http://localhost:5173 | 5173 | Proxies `/api/*` to the API service |
| API (Express) | `apps/api` | http://localhost:8000 | 4000 | Cookie-based JWT auth |
| PostgreSQL 17 | — | `localhost:5433` (host) | 5432 | Published from `db` service |

---

## 1. Prerequisites

- **Node.js >= 20.12** (the API loads `.env` with `process.loadEnvFile`, added in Node 20.12; `node -v` prints the version; the repo declares `engines.node >= 20`). *Verified.*
- **npm 10+** ships with Node 20+. `npm -v`. *Verified.*
- **Docker Desktop** (for the compose stack). `docker compose version`, `docker --version`. *Verified (used during development).*
- A terminal. All commands below are run **from the repository root** unless stated otherwise; PowerShell examples are given, bash equivalents are the same minus path syntax.

No global packages are required. Drizzle tooling, tsx and faker are local devDependencies.

## 2. Clone the repository

```powershell
git clone https://github.com/<your-org-or-user>/orders-console.git
cd orders-console
```

*(Replace the URL with the real remote; `git remote -v` shows it.)*

**Dependencies** are installed in three places depending on the run mode:

- **Docker mode (recommended):** `npm install` runs **inside the image build** (both Dockerfiles copy the workspace manifests and run `npm install`). After cloning you do **not** need to run `npm install` yourself — the images already contain it, and `node_modules` is provided by anonymous volumes.
- **Host dev mode (optional):** you need dependencies on the host as well — run `npm install` at the repo root (npm workspaces install all shared/hóisted deps for `apps/api` and `apps/web`).

## 3. Environment variables

The repo currently contains **real local `.env` files but no `.env.example` files** (checked; none are tracked by git). Copy the template below into the indicated paths.

### `apps/api/.env` — used by the **host** (schema push + seed + local API dev)

The API loads it through `apps/api/src/db/env.ts` → `process.loadEnvFile()`. The loader looks for `apps/api/.env` **relative to the current working directory**, so this file must exist and every npm root script (`npm run db:push`, `npm run seed`, …) must be run **from the repo root**. Values here are *host-oriented*:

```ini
# PostgreSQL (docker maps host port 5433 -> container 5432)
POSTGRES_USER=orders
POSTGRES_PASSWORD=orders
POSTGRES_DB=orders_console
POSTGRES_PORT=5433

# Host-oriented connection string (note port 5433, matches docker publish)
DATABASE_URL=postgresql://orders:orders@localhost:5433/orders_console

# API
PORT=4000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# Required: at least 32 characters (checked at module load in src/utils/token.ts).
# Generate with:  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=<replace-with-a-generated-64+-hex-char-string>
```

> **Never commit this file.** Root `.gitignore` already ignores `.env` at any depth (checked: `git ls-files` shows no `.env` tracked). Use a generated placeholder secret value, not the known demo secret.

### `apps/web/.env` — used by the **host** Vite dev server

```ini
# Where the Vite dev proxy forwards /api/* when you run the web app on the host
API_PROXY_TARGET=http://localhost:8000   # use http://localhost:4000 if running npm run dev:api
```

### Inside Docker Compose (no file needed)

When you run the stack with Docker Compose you do **not** need any host-side `.env` file at all:

- `db` gets its credentials from compose environment (`POSTGRES_USER/PASSWORD/DB`).
- `api` gets `DATABASE_URL=postgresql://orders:orders@db:5432/orders_console` — note the **Docker service name `db` and the *internal* port 5432**, **not** `localhost:5433`.
- `web` gets `API_PROXY_TARGET=http://api:4000` — again a **service name with the internal port**; the Vite config prioritizes `process.env.API_PROXY_TARGET` over `.env` files, so compose overrides.
- `JWT_SECRET` is supplied by compose too (any ≥32-char value works for local dev).

**Rule of thumb:** inside containers use *service names + internal ports*; on the host/browser use *localhost + published ports*.

## 4. Start Docker Compose

Compose file: **`docker-compose.yml` in the repository root.**

```powershell
# from the repository root
docker compose up -d --build        # build + start all three services
# or the repo script equivalents:  npm run docker:build  /  npm run docker:up
```

What runs:

| Service | Purpose |
|---------|---------|
| `db` | PostgreSQL 17, `pg_isready` healthcheck, data persisted in the `db-data` named volume |
| `api` | Express API (`tsx watch src/server.ts` — hot reload; `apps/api/src` is bind-mounted), listens on 4000 internally, published at :8000 |
| `web` | Vite dev server (`vite --host`, hot reload; `./apps/web` bind-mounted) at :5173, proxying `/api` to `http://api:4000` |

Check status / logs (**all from the repo root**):

```powershell
docker compose ps                # status + reported health
docker compose logs db --tail 50
docker compose logs api --tail 50
docker compose logs web --tail 50
```

Ready markers:

- `docker compose ps` shows `db ... (healthy)`, `api` "Up", `web` "Up".
- `docker compose logs db` shows `database system is ready to accept connections`.
- `docker compose logs api` shows `Server is running on port 4000`.
- `docker compose logs web` shows `VITE v8.x ready` and `Local: http://localhost:5173/`.

**Schema and seed do NOT run automatically** with `docker compose up` — perform steps 5 and 6 manually (the `api` container does not run drizzle-kit; drizzle runs from the host in this repo).

## 5. Apply the database schema

The ORM is **Drizzle ORM (`drizzle-orm` 1.0 RC)** with `drizzle-kit` for tooling. There are **no committed migration files** — the project uses the **schema-push workflow**:

```powershell
# from the repository root (host terminal)
npm run db:push
```

Expected output ends with `[✓] Changes applied`. *Verified.*

Command details:

- `drizzle-kit push --config apps/api/drizzle.config.ts` reads `apps/api/src/db/schema/*.ts` (`user.ts` → `users`, `order.ts` → `orders` + `order_items`) and synchronizes the Postgres schema (**additive/idempotent**; it does not wipe existing data).
- It reads `DATABASE_URL` from `apps/api/.env` (defaults to `postgresql://postgres:postgres@localhost:5432/orders_console` only when the env file is missing — which will not work with the compose stack, hence the env file is required).
- Host execution needs the Docker DB published port (**5433**) in `DATABASE_URL`.

(`npm run db:generate` also exists in the root scripts for generating migration files into `apps/api/drizzle` if you prefer the migration workflow — but the current backup-and-await workflow of this repo is `push`.)

## 6. Seed the database — at least 50,000 orders

```powershell
# from the repository root (host terminal); the API containers do not need to run for this.
npm run seed
```

*Verified.* What it does (see `apps/api/src/db/seed.ts`):

| What | Value |
|------|-------|
| Users (upsert-by-email, non-destructive, bcrypt-hashed passwords) | `admin@orders.local` / `ADMIN`, `manager@orders.local` / `MANAGER`, `user@orders.local` / `USER`, `agent@orders.local` / `AGENT` |
| Orders | **exactly 50,000**, random names/emails, status drawn from `PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED`, 5 currencies, creation dates spread over the past year, unique `idempotency_key` per order |
| Line items | **1–5 per order** (±150k rows total), `amount` = Σ(quantity × unit_price) — server of the *seed* and the *create-endpoint* both derive totals this way |
| Re-run behavior | **Safe to repeat, but destructive**: it truncates `order_items` + `orders` and regenerates everything fresh; users are upserted and preserved. It never *duplicates* orders. |

Confirm the counts (read-only):

```powershell
docker exec order_console-db-1 psql -U orders -d orders_console -c `
  "SELECT (SELECT count(*) FROM orders) AS orders, (SELECT count(*) FROM order_items) AS line_items, (SELECT count(*) FROM users) AS users"
```

Expected after a fresh seed: `50000 | ~150000 | 4`. *Verified: `50000 | 149988 | 4`, and min/max line-items per order as `(1, 5)`, and zero mismatches between `orders.amount` and Σ line-item totals — all confirmed via psql.*

## 7. Run the application

**Docker mode (single command, everything included):**

```powershell
docker compose up -d --build
```

starts db + api + web — no duplicate processes needed. Open: **http://localhost:5173**.

**Host dev mode (optional; keep the `db` container running):**

```powershell
npm run dev:api     # Express on http://localhost:4000, reads apps/api/.env
npm run dev:web     # separate terminal: Vite on http://localhost:5173, proxies /api to apps/web/.env target
```

## 8. URLs, health check, login

| What | URL |
|------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| API health/root probe | http://localhost:8000/ → `{"message":"hello world"}` *(verified; there is no dedicated `/healthz` route)* |
| Login page | http://localhost:5173/login |

**Login:** the app redirects to `/login`. Seed accounts (from `apps/api/src/db/seed.ts`, demo credentials committed intentionally):

| Email | Password | Role |
|-------|----------|------|
| `admin@orders.local` | `Admin123!` | ADMIN |
| `manager@orders.local` | `Manager123!` | MANAGER |
| `user@orders.local` | `User123!` | USER |
| `agent@orders.local` | `Agent123!` | AGENT |

Auth mechanics: `POST /api/auth/login` sets an **HttpOnly cookie named `token`** (HS256 JWT, 1h expiry, role in payload, verified against `JWT_SECRET` ≥32 chars) and returns `{ user }` in the body — the token never appears in JS. `GET /api/auth/me` restores the session from the cookie; `POST /api/auth/logout` clears it. Stateful-role endpoints: `DELETE /api/orders/:id` requires the **ADMIN** cookie (403 otherwise).

## 9. API surface (as implemented — do not assume anything else)

| Method | Path | Query/body | Response |
|--------|------|-----------|----------|
| `POST` | `/api/auth/login` | body: `{ email, password }` | 200 `{ user }` + `Set-Cookie: token=…` HttpOnly; 400 validation; 401 bad credentials |
| `GET` | `/api/auth/me` | cookie | 200 `{ user }`; 401 without/with bad cookie |
| `POST` | `/api/auth/logout` | cookie (optional) | 204 + cookie cleared |
| `POST` | `/api/orders` | body: `{ customerName, customerEmail, status?, amount, currency?, items??: [{name, quantity, unitPrice}] }` + `Idempotency-Key` **header** (or `idempotencyKey` body field, ≥8 chars, **required**) | 201 `{ message, order }`; on replay with the same key: 200, same order, no duplicate. When `items` are provided the server **recomputes** `amount` = Σ(qty × price) |
| `GET` | `/api/orders` | `page` (def 1), `limit` (def 20, max 100), optional composable `search` (name/email ILIKE), `status`, `sortBy` (`createdAt`\|`amount`), `sortOrder` (`asc`\|`desc`, def `desc`) | 200 `{ message, pagination: {page, limit, total, totalPages, hasNextPage, hasPreviousPage}, orders: Order[] }` |
| `GET` | `/api/orders/search` | `search` (required, 1–150) | 200 `{ message, count, orders }` — **all** matches, no pagination |
| `GET` | `/api/orders/status` | `status` (required enum) + paging params | 200 same shape as `GET /api/orders` |
| `DELETE` | `/api/orders/:id` | cookie auth | 200 `{ message, order }`; 400 bad uuid; 401 no/invalid cookie; 403 non-ADMIN; 404 unknown |

Frontend pages ⇄ endpoints mapping:

- Orders list (table + search + status + sort + pagination) ⇄ `GET /api/orders` with composable params (race-safe AbortController + 350 ms debounce client-side).
- Dedicated routes `/api/orders/search` and `/api/orders/status` remain for single-purpose consumers; the UI uses the composable listing to combine them server-side.
- Create order (line items + total) ⇄ `POST /api/orders` with an idempotency header generated per submit.
- Auth (login/session/protect routes) ⇄ `POST /api/auth/login`, `GET /api/auth/me` (route guard), `POST /api/auth/logout`.

An `Order` row looks like: `{ id, orderNumber, customerName, customerEmail, status, amount (string), currency, idempotencyKey, createdAt, updatedAt }`.

## 10. Verification & tests

### 10.1 Static checks

```powershell
npm run typecheck    # tsc --noEmit for both workspaces
npm run lint         # eslint for the web app (api has no eslint config)
npm run build        # builds both workspaces (web: vite build)
```

> **Status note:** these passed during development, but the line-items frontend changes landed shortly before the code freeze and were **not re-run after that** (this documentation pass was forbidden from running builds, since `vite build` writes files). If they flag something in `CreateOrderPage`/`createOrder.schema`, run them locally and report.

### 10.2 Duplicate-order / idempotency protection (repo script)

```powershell
# from the repository root; requires the Docker stack on :8000
node scripts/idempotency-race-test.mjs [iterations] [identical|different] [requestsPerRace]

# example: 3 iterations of 5 concurrent identical POSTs sharing one key
node scripts/idempotency-race-test.mjs 3 identical 5
```

The script (committed at `scripts/idempotency-race-test.mjs`) fires N **concurrent** POST requests to `POST /api/orders` sharing the same `Idempotency-Key`, then checks — directly against Postgres via `apps/api/.env`'s `DATABASE_URL` — that `rows 0 -> 1` (exactly one order exists) and that **all** responses returned the **same `order.id`/`orderNumber`** (200/201). It prints a `PASS`/`FAIL` table per iteration.

**Status: unverified in this documentation pass** (executing it performs DB writes, which are prohibited for this phase). Independent evidence the protection works: an earlier end-to-end sequence — create → replay with the same key → `200` with identical `orderNumber`, plus the `order_items` FK linkage — was verified before the freeze; the DB constraint `UNIQUE (idempotency_key)` + `onConflictDoNothing` is the safety net, and the API falls back to re-reading the winner row if it loses the insert race (verified in code).

**SQL check that no idempotency key ever produced two orders:**

```sql
SELECT idempotency_key, COUNT(*) AS orders_with_this_key
FROM orders
GROUP BY idempotency_key
HAVING COUNT(*) > 1;      -- expect 0 rows
```

### 10.3 Orders listing / search / filter / sort / pagination (read-only probes)

```powershell
Invoke-RestMethod 'http://localhost:8000/api/orders?page=2&limit=20'                   # pagination
Invoke-RestMethod 'http://localhost:8000/api/orders?search=john&status=PENDING&sortBy=amount&sortOrder=asc&page=1'  # combined
Invoke-RestMethod 'http://localhost:8000/api/orders/search?search=john'                 # all matches, no pagination
Invoke-RestMethod 'http://localhost:8000/api/orders/status?status=SHIPPED&page=1'       # filtered + paged
```

*Verified with the seeded 50k rows: list (total = 50000), combined query, `search=john` (matches found), `status=PENDING` (filtered totals) — all returned 200 with the shapes above.*

Browser-level race-condition/debounce verification: on http://localhost:5173 → **Orders** list — type in the Search box (no request before ~350 ms of idle — visible as a small spinner next to the search input), then switch the **Status** filter quickly several times. The UI aborts each superseded request (`AbortController`) and only ever renders the results of the *latest* committed filter set; superseded requests never display errors (empty flash or stuck spinners would be the bug). This behavior is implemented in `apps/web/src/features/orders/hooks/useOrdersQuery.ts` + `useDebouncedValue.ts` and was exercised via an abort-orchestration harness during development; it is not an automated test in the repo — treat it as a manual UI check.

### 10.4 Auth verification (cookie flows)

```powershell
# bash/curl variant is simplest for cookie jars:
curl -c cookies.txt -s -X POST http://localhost:8000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@orders.local","password":"Admin123!"}'          # 200 { user }, Set-Cookie HttpOnly
curl -b cookies.txt http://localhost:8000/api/auth/me                  # 200 { user }
curl -s http://localhost:8000/api/auth/me                              # 401
curl -b cookies.txt -X DELETE http://localhost:8000/api/orders/<a-valid-uuid-from-the-list>  # 200 (ADMIN only)
# same DELETE with user@orders.local cookie → 403
```

*Status: the login/`me`/401/403/204-logout serviçe flows were verified end-to-end through the :5173 dev proxy during development; the raw `curl` commands above reproduce them.*

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ECONNREFUSED ::1:5433` / `…127.0.0.1:5433` during `db:push` or seed | The `db` container isn't running / not healthy yet | `docker compose ps` → wait for `(healthy)`; `docker compose up -d db`; re-run |
| `DATABASE_URL is not set` (host scripts) | `apps/api/.env` missing | Create it (§3); the loader searches `apps/api/.env` **relative to the current directory** — run npm scripts from the repo root |
| `JWT_SECRET must contain at least 32 characters` (API startup) | Secret missing/short in `apps/api/.env` (host) | Generate ≥64 hex chars and don't wrap/quote the line (leading/trailing spaces around `=` are tolerated by Node but avoid them) |
| drizzle-kit touches the wrong database | Missing `.env` → fallback `postgres:postgres@localhost:5432` | Keep `DATABASE_URL` in `apps/api/.env`; re-run `npm run db:push` |
| API answers with old routes (e.g. a 404 for a route you know exists) after source edits | `tsx watch` inside the container occasionally misses a reload burst | `docker compose restart api` (observed during development) |
| Port already in use (`5433`, `8000`, `5173`) | Another instance/other app holds the port | Stop the other process (`netstat -ano \| findstr :PORT` on Windows) or change the **published** port mapping in `docker-compose.yml` (container-internal ports stay) |
| `docker compose` shows unhealthy db | DB still initializing on first run (10 s `start_period`) or volume permission issues | `docker compose logs db --tail 50`; wait for readiness, then re-run the dependent services |
| Login works but API calls return 401 | Cookie not sent/rejected | Make requests through http://localhost:5173 (same-origin/proxied) or configure `credentials: "include"`; cookie is `HttpOnly` so it can't be attached by JS manually |
| Build failures of images (`npm install` inside `node:22`) | Network/registry hiccups, proxy settings | `docker compose build --no-cache web api` |
| Seed inserts fail with FK/unique errors after partial manual edits | DB half-modified | Re-run `npm run db:push` then `npm run seed` (seed truncates orders/items and regenerates; users are preserved) |

## 12. Stop / cleanup — and the volume warning

```powershell
docker compose stop            # keep containers + data (resume later with `docker compose start`)
docker compose down            # stop and remove containers + networks; DATABASE DATA IS KEPT (db-data volume)
docker compose down -v         # stop + DELETE the db-data volume — destroys all seeded data
```

**Never use `down -v` as a routine stop.** `down` keeps the `db-data` named volume, so a later `docker compose up` reconnects to the same data. `down -v` wipes the database — you'd need `db:push` + `seed` again (that is also how you get a rebuildable state from a clean clone: `up --build` → `db:push` → `seed`).

---

### Quick-start recap (clean clone → running app)

```powershell
git clone <repo-url>; cd orders-console
# create apps/api/.env and apps/web/.env as per §3 (Docker-only mode needs neither — see note)
docker compose up -d --build
docker compose ps                      # wait for db (healthy)
npm install                            # only needed for host-side commands (§5/§6/§10)
npm run db:push                        # create tables
npm run seed                           # 50,000 orders + line items + users
# open http://localhost:5173 and log in with admin@orders.local / Admin123!
```

*Verification legend: steps marked **Verified** were executed in this exact repository state (compose stack, schema push, seed counts, API probes, SPA serving). The `scripts/idempotency-race-test.mjs` execution and a post-freeze `lint`/`typecheck`/`build` re-run are documented but **unverified** here because running them writes files/database rows.*
