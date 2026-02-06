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
| GET/POST | `/api/biochar` | List / create biochar deployments |
| GET/PUT | `/api/biochar/:id` | Get / update biochar deployment |
| GET/POST | `/api/coconut` | List / create coconut submissions |
| GET | `/api/coconut/:id` | Get coconut submission |

## Local development

1. Create a PostgreSQL database (local or Railway).
2. Copy env and set `DATABASE_URL`:
   ```bash
   cp .env.example .env
   # Edit .env: DATABASE_URL=postgres://user:pass@localhost:5432/dbname
   ```
3. Install and run:
   ```bash
   npm install
   npm run db:init   # Apply schema once
   npm run dev       # Start API (with --watch)
   ```
   API: http://localhost:3000

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
- `biochar_deployments` – biochar deployment tracking
- `coconut_submissions` – field agent coconut data

All tables use `CREATE TABLE IF NOT EXISTS`, so it’s safe to run on every deploy.
