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

## Local development (save to database)

**One-time setup** (requires [Docker](https://docker.com)):

```bash
npm run db:setup
```

This starts PostgreSQL, creates `api/.env`, and applies the schema.

**Or manually:**

1. Start PostgreSQL: `docker-compose up -d`
2. Copy env: `cp api/.env.example api/.env`
3. Run: `npm run dev` — schema and migrations run **automatically** on first start (no manual `db:init` needed). Optionally run `npm run db:init` once to apply schema/migrations without starting the server.

API: http://localhost:3000 — data will save to the database.

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
4. **Variables**: Use the **public** DB URL so the API can resolve the host. In Railway: **API service** → **Variables** → **Add Variable** → **Reference** → select **Postgres** → choose **`DATABASE_PUBLIC_URL`** (not `DATABASE_URL`; the internal URL can cause `ENOTFOUND`).
5. Deploy: Railway will build and deploy. On first start, `db:init` creates the tables.

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
