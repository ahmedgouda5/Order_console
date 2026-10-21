# Orders Console

React (Vite) frontend + Node/Express API + PostgreSQL 17 (Drizzle ORM), run with Docker Compose.
The database is seeded with **50,000 orders** (1-5 line items each).

| Service | URL |
|---------|-----|
| Web | http://localhost:5173 |
| API | http://localhost:8000 |
| PostgreSQL | localhost:5433 |

## 1. Setup

Requirements: Node >= 20.12, npm 10+, Docker Desktop.

```bash
git clone <repo-url>
cd orders-console
```

Create `apps/api/.env`:

```ini
POSTGRES_USER=orders
POSTGRES_PASSWORD=orders
POSTGRES_DB=orders_console
POSTGRES_PORT=5433
DATABASE_URL=postgresql://orders:orders@localhost:5433/orders_console
PORT=4000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
# at least 32 characters. Generate one with:
# node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=<generated-secret>
```

Create `apps/web/.env`:

```ini
API_PROXY_TARGET=http://localhost:8000
```

## 2. Run

```bash
npm install                    # on the host: needed for db:push and seed (they run outside Docker)
docker compose up -d --build   # db + api + web (Docker installs its own packages inside the images)
docker compose ps              # wait until db is (healthy)
npm run db:push                # create tables
npm run seed                   # 50,000 orders + users
```

Open http://localhost:5173 and log in.

## 3. Login (seeded users)

| Email | Password | Role |
|-------|----------|------|
| admin@orders.local | Admin123! | ADMIN |
| manager@orders.local | Manager123! | MANAGER |
| user@orders.local | User123! | USER |
| agent@orders.local | Agent123! | AGENT |

## 4. Tests

**Idempotency test** (no duplicate orders):

```bash
node scripts/idempotency-race-test.mjs 3 identical 5
```

It sends several identical `POST /api/orders` requests **at the same time** with the same `Idempotency-Key`.
Then it checks the database: exactly **one** order exists, and all responses returned the same order.
Prints `PASS` / `FAIL`.

Result of a real run (3 iterations, 5 parallel identical requests each):

```text
PS A:\projects\order_console> node scripts/idempotency-race-test.mjs 3 identical 5
#1 key=identical_5r_1_1792612373140 statuses=[200,201,200,200,200] idsEqual=true numbersEqual=true rows 0->1 -> PASS
#2 key=identical_5r_2_1792612373325 statuses=[201,200,200,200,200] idsEqual=true numbersEqual=true rows 0->1 -> PASS
#3 key=identical_5r_3_1792612373384 statuses=[201,200,200,200,200] idsEqual=true numbersEqual=true rows 0->1 -> PASS

Run config: mode=identical requestsPerRace=5
┌─────────┬───────────┬───────────────────────┬──────────┬──────────────┬────────────┬───────────┬─────────┐
│ (index) │ iteration │ statuses              │ idsEqual │ numbersEqual │ rowsBefore │ rowsAfter │ verdict │
├─────────┼───────────┼───────────────────────┼──────────┼──────────────┼────────────┼───────────┼─────────┤
│ 0       │ 1         │ '200,201,200,200,200' │ true     │ true         │ 0          │ 1         │ 'PASS'  │
│ 1       │ 2         │ '201,200,200,200,200' │ true     │ true         │ 0          │ 1         │ 'PASS'  │
│ 2       │ 3         │ '201,200,200,200,200' │ true     │ true         │ 0          │ 1         │ 'PASS'  │
└─────────┴───────────┴───────────────────────┴──────────┴──────────────┴────────────┴───────────┴─────────┘
ALL 3 RACE TESTS PASSED
```

How to read it: in each race, exactly one request got `201` (created) and the other four got `200` (replay of the same order). The order id and number are identical in all responses, and the table gains exactly one row (`0 -> 1`).

Other checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## 5. How the main problems are solved

### Race condition in the list (R1)
- Every filter / search / sort change **aborts the previous request** with `AbortController`.
- The aborted request's error is ignored, so an old, slow response can never overwrite the latest one.
- Search is debounced (350 ms).
- Code: `apps/web/src/features/orders/hooks/useOrdersQuery.ts`.
- Pagination is server-side (`limit` max 100). The full table is never sent to the browser.

### No duplicate orders (R2)
- Every create request has an `Idempotency-Key`.
- The database has `UNIQUE (idempotency_key)` and the insert uses `onConflictDoNothing`.
- If a second request arrives with the same key, the server returns the **existing order** (200), not a new one.
- So the guarantee is on the server, not only in the UI.
- The server also recalculates `amount` from the line items.

## 6. Code review: authentication

Problems found in the contractor's code, and what I changed:

| # | Problem | Fix |
|---|---------|-----|
| 1 | `jwt.decode()` does **not verify the signature**. Anyone can create a fake token with `role: "ADMIN"`. | Use `jwt.verify()` with the secret, HS256 only. |
| 2 | JWT secret is hardcoded in the code (`"sarh-secret-2026"`). | Secret comes from `JWT_SECRET` env var (min 32 chars). The app fails to start without it. |
| 3 | Token is accepted from the URL (`?token=`). It leaks in logs and browser history. | Token is read only from the HttpOnly cookie. |
| 4 | Admin check is only in the React `AdminOnly` component. Anyone can call the API directly. | Role check on the server: `DELETE /api/orders/:id` returns 403 if not ADMIN. |
| 5 | Passwords are stored and compared as plain text. | Passwords are hashed with bcrypt. |
| 6 | Token has no expiry (`jwt.sign` without `expiresIn`). | Token expires in 1 hour. |
| 7 | Login returns the token in the response body, so the frontend has to keep it in JS. | Login sets an HttpOnly cookie. |

### Where is the token stored?
In an **HttpOnly cookie**. JavaScript cannot read it, so an XSS attack cannot steal the token.
It does **not** stop an XSS script from sending requests while the user is on the page, and it does not fully stop CSRF by itself (`SameSite` and a fixed `CLIENT_ORIGIN` help with that).

## 7. Product question: "Delete all cancelled orders" button

I would ask her:
1. **Why** do you want to delete them? Is it clutter in the list, or something else?
2. **Who** is allowed to do it? Only admins?
3. Do we need cancelled orders later (refunds, reports, accounting, audit)?
4. Is it OK if it cannot be undone?

If she cannot answer: don't build a hard delete. Instead, add a filter that hides cancelled orders by default (or an "archive" / soft delete), allow it for **ADMIN only**, and show the number of orders with a confirmation before doing it. I will check with her who is allowed to delete, and I can suggest the rule from my side.

## 8. What I skipped and why

- **Optional tasks (O1, O2):** not done, to stay inside the time budget.
- **Automated tests:** only the idempotency script is a real test. The rapid-filter check is manual (type in search, change the status filter quickly, and the UI shows only the latest result).
- **Migrations:** I use `drizzle-kit push`, no migration files.
- **Last checks:** `lint`, `typecheck`, `build` were not re-run after the last frontend change (line items form). Run them locally.
- **No `/healthz` route:** `GET /` returns `{"message":"hello world"}`.

## 9. Stop / clean up

```bash
docker compose stop        # keep data
docker compose down        # remove containers, keep data
docker compose down -v     # DELETES the database volume
```

## 10. Troubleshooting

| Problem | Fix |
|---------|-----|
| `ECONNREFUSED ...:5433` | DB is not ready. `docker compose ps`, wait for `healthy`. |
| `DATABASE_URL is not set` | Create `apps/api/.env`. Run npm scripts from the repo root. |
| `JWT_SECRET must contain at least 32 characters` | Generate a longer secret. |
| Port already in use | Stop the other app or change the published port in `docker-compose.yml`. |
| API route returns 404 after edits | `docker compose restart api` |
