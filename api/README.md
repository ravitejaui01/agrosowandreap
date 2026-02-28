# SOWANDREAP Agroforestry API

Express + PostgreSQL API for the Agroforestry and Field Agent apps.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| GET | `/ready` | Readiness (checks DB) |
| GET/POST | `/api/users` | List / create users |
| GET | `/api/users/:id` | Get user |
| GET/POST | `/api/farmers` | List / create farmer records |
| GET | `/api/farmers/stats` | Dashboard stats |
| GET/PATCH | `/api/farmers/:id` | Get / update farmer record |
| GET | `/api/coconut` | Coconut Plantation – list all |
| GET | `/api/coconut/stats` | Coconut Plantation – dashboard stats |
| GET | `/api/coconut/:id` | Get one coconut submission |
| POST | `/api/coconut` | Coconut Plantation Registration – create |
| POST | `/api/coconut/sync-to-farmers` | Sync `coconut_submissions` → `farmer_records` (manual) |
| GET/POST | `/api/rules` | List / create rules |
| GET | `/api/rules/:id` | Get one rule |
| PATCH | `/api/rules/:id` | Update rule |
| DELETE | `/api/rules/:id` | Delete rule |

**Scheduled sync:** The API automatically syncs `coconut_submissions` to `farmer_records` on startup and every 5 minutes. To change the schedule, set `COCONUT_SYNC_CRON` (e.g. `*/10 * * * *` for every 10 min). Set `COCONUT_SYNC_CRON=0` to disable scheduled sync.

## Use a remote database (no local Docker)

1. Create a PostgreSQL database (e.g. [Railway](https://railway.app) → New → Database → PostgreSQL, or Neon, Supabase, etc.).
2. Copy the **connection URL** (often called `DATABASE_URL` or `DATABASE_PUBLIC_URL`). It looks like:
   `postgres://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require`
3. In `api/.env` set:
   ```bash
   DATABASE_URL=postgres://...your-remote-url...
   ```
4. Start the API: `npm run dev` (from repo root) or `cd api && npm run dev`. Schema and migrations run automatically; data saves to your remote DB.

**DBeaver (or any client)** — connect using the same URL:
- **Host:** from the URL (e.g. `roundhouse.proxy.rlwy.net` for Railway)
- **Port:** 5432 (or the one in the URL)
- **Database:** database name from the URL
- **Username / Password:** from the URL
- **SSL:** enable (e.g. require or verify-full) for cloud Postgres

No local Docker or `docker-compose` needed.

---

## Optional: local development with Docker

If you prefer local PostgreSQL:

1. Run: `docker-compose up -d`
2. In `api/.env`: `DATABASE_URL=postgres://agroforestry:agroforestry@localhost:5432/agroforestry`
3. Run: `npm run dev`. API: http://localhost:3000 — data saves to the local database.

### Records not saving to `coconut_submissions` table?

- **Check API startup log.** If you see *"No DATABASE_URL set — coconut submissions will use fallback store"*, the API is **not** using PostgreSQL. Submissions go to in-memory/fallback only.
- **Fix:**  
  1. Start Postgres: `docker-compose up -d`  
  2. Ensure `api/.env` has `DATABASE_URL=postgres://agroforestry:agroforestry@localhost:5432/agroforestry` (or your DB URL)  
  3. Restart the API. You should see *"Database: using PostgreSQL (coconut_submissions table)"*.
- **Field Agent app:** For local dev, leave `VITE_API_URL` unset in `field-agent-app/.env` so the app uses the Vite proxy and sends submissions to your local API (port 3000). If the app points at a different API (e.g. production), submissions go to that server’s DB, not your local one.

**Check where data went:** When you submit a registration, watch the **API terminal**. You should see either:
- `[coconut] Saving to PostgreSQL coconut_submissions...` then `[coconut] Saved to PostgreSQL coconut_submissions, id: ...` → data is in the DB.
- `[coconut] No DATABASE_URL — saving to fallback store` → data is only in memory/file, not in PostgreSQL.
- `[coconut] INSERT failed. Data NOT saved to database. ...` → API returns 503; fix the DB connection (Railway Variables → DATABASE_PUBLIC_URL) and try again.

**Verify rows:** Use DBeaver (or any client) connected to your **remote** database → open table `coconut_submissions`. For local Docker only: `docker exec -it $(docker ps -q -f name=db) psql -U agroforestry -d agroforestry -c "SELECT id, farmer_name FROM coconut_submissions;"`

## Railway setup

### 1. Create project and database

1. Go to [railway.app](https://railway.app) and create a new project.
2. Click **+ New** → **Database** → **PostgreSQL**. Railway creates the DB and sets `DATABASE_URL` in the project.

### 2. Deploy the API

1. In the same project, click **+ New** → **GitHub Repo**.
2. Select `ravi-teja001/SOWANDREAP_AGROFORESTRY` and branch `Dev`.
3. After the service is created, open it and go to **Settings**:
   - **Root Directory**: set to `api` (so Railway uses `api/package.json` and runs from `api/`).
   - **Build Command**: leave default (Nixpacks will run `npm install`).
   - **Start Command**: `npm run db:init && npm start` (or leave default if you set it in `railway.json`).
4. **Variables (required for data to save to Postgres):** The API service must have the database URL. In Railway: **API service** → **Variables** → **Add Variable** → **Reference** → select your **Postgres** service → choose **`DATABASE_PUBLIC_URL`**. Add it with that exact name. Without this, coconut submissions go to fallback store only and are **not** saved to the database.
5. Deploy: Railway will build and deploy. On first start, schema/migrations run automatically.

**Data still not in database?** Check the **API service logs** (Deployments → latest → View Logs). You should see either:
- `Database: connected to PostgreSQL. coconut_submissions will be used.` → DB is connected; if data still doesn’t appear, look for `[coconut] INSERT failed` and the error message.
- `Database: DATABASE_URL / DATABASE_PUBLIC_URL not set` → Add the variable in step 4 and redeploy.
- `Database: PostgreSQL connection failed` → Check the error; often the API needs `DATABASE_PUBLIC_URL` (not the internal URL).

**Data still not in DB?** Both frontends must call the **same Railway API** (the one that has `DATABASE_PUBLIC_URL` set):
- **Field Agent:** In `field-agent-app/.env` set `VITE_API_URL=https://your-railway-api.up.railway.app` (no trailing slash). If unset, the app sends to localhost and submissions never reach Railway.
- **Data Validator (Agroforestry):** Set `VITE_API_URL` to the same Railway API URL when building/deploying Agroforestry so Farmer Records and stats load from the same database.

### 3. Get the API URL

- In the API service, open **Settings** → **Networking** → **Generate Domain**.
- Your API base URL will be like: `https://your-service.up.railway.app`
- Use it in the frontend as `VITE_API_URL=https://your-service.up.railway.app` (or your env name).

## Schema (run once)

`npm run db:init` runs `src/db/schema.sql`, which creates:

- `users` – app users and roles
- `farmer_records` – farmer registration records
- `documents` – documents linked to farmer records
- `validation_history` – workflow history
- `coconut_submissions` – field agent coconut data

All tables use `CREATE TABLE IF NOT EXISTS`, so it’s safe to run on every deploy.
