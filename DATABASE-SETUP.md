# Database Setup: Local vs Railway (Why Data May Not Save)

## Your Current Setup

| File | Purpose | Your Value |
|------|---------|------------|
| **api/.env** | Used **only when running API locally** (`cd api && npm run dev`) | `DATABASE_URL=postgres://...@localhost:5432/agroforestry` → **LOCAL** |
| **field-agent-app/.env** | Where Field Agent sends coconut registrations | `VITE_API_URL=https://api-production-de18.up.railway.app` → **RAILWAY LIVE** |

**Important:** When the API runs on **Railway**, it does **not** use `api/.env`. Railway uses variables set in the Railway dashboard.

---

## Why You See Success but Data Doesn't Appear

1. **Field Agent** sends to **Railway API** (because `VITE_API_URL` points there).
2. **Railway API** needs `DATABASE_PUBLIC_URL` (Railway Postgres) to save to the database.
3. If Railway API does **not** have `DATABASE_PUBLIC_URL`:
   - It uses fallback (in-memory) and returns `_savedTo: "fallback"`.
   - You should see the **error** toast: *"Record was not saved to the database..."*
4. If you see the **success** toast, the API usually returned `_savedTo: "database"` — so it claims to have saved.

If you still don’t see data in Data Validator:

- Railway API might not have Postgres connected (`DATABASE_PUBLIC_URL` missing or wrong).
- Data might be in Railway DB but you’re checking local DB (e.g. DBeaver on localhost).
- Data Validator might be talking to a different API.

---

## Option A: Use LOCAL (Everything on Your Machine)

1. **Start Postgres:** `docker-compose up -d`
2. **api/.env:** Keep `DATABASE_URL=postgres://agroforestry:agroforestry@localhost:5432/agroforestry`
3. **Start API:** `cd api && npm run dev` (API on http://localhost:3000)
4. **field-agent-app/.env:** Remove `VITE_API_URL` or set it to `http://localhost:4200` / empty so the app uses the Vite proxy → local API.
5. **Agroforestry:** Ensure its proxy points to `http://localhost:3000` (edit `Agroforestry/vite.config.ts` if needed).

All apps then use the same local API and local Postgres.

---

## Option B: Use RAILWAY LIVE

1. **Railway Dashboard** → Your API service → **Variables**.
2. Add a **Variable Reference** → select your Postgres service → choose **`DATABASE_PUBLIC_URL`**.
3. Redeploy the API.
4. **field-agent-app/.env:** `VITE_API_URL=https://api-production-de18.up.railway.app` (already set).
5. **Agroforestry:** Proxy or `VITE_API_URL` must point to the same Railway API.

---

## How to Verify

### Railway API logs

1. Railway Dashboard → API service → **Deployments** → latest deployment → **View Logs**.
2. Look for:
   - `Database: connected to PostgreSQL. coconut_submissions will be used.` → DB connected.
   - `[coconut] Saving to PostgreSQL coconut_submissions...` then `[coconut] Saved to PostgreSQL coconut_submissions, id: ...` → data saved.
   - `[coconut] No DATABASE_URL — saving to fallback store` → data **not** saved (fallback only).
   - `[coconut] INSERT failed. Data NOT saved to database.` → DB error.

### API health check

- `https://api-production-de18.up.railway.app/ready` → Should return `{"ok":true,"db":"connected"}` if Postgres is connected.

### Check Data Validator

- Data Validator (Agroforestry) must use the same Railway API URL as Field Agent.
