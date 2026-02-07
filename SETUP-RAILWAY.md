# Setup: Field Agent → Data Validator with Railway

## What you want
1. **Field Agent** (login) → Coconut Plantation Registration → Submit
2. **Record saves** to Railway Database
3. **Data Validator** (login) → Farmer Records table → See the data

## Your setup
- Railway Database: live
- Railway API: live
- Field-agent app: runs locally

---

## Fix the 500 error: Point to Railway API

The field-agent app must call your **Railway API** URL, not localhost.

### Step 1: Get your Railway API URL
In Railway dashboard: API service → Settings → Networking → **Generate Domain** (if not done).  
Example: `https://your-api-name.up.railway.app`

### Step 2: Create field-agent-app/.env

```bash
cd field-agent-app
```

Create `.env` with:

```
VITE_API_URL=https://your-api-name.up.railway.app
```

Replace with your real Railway API URL (no trailing slash).

### Step 3: Run only the field-agent app

```bash
cd field-agent-app
npm run dev
```

Or from project root:

```bash
npm run dev:app
```

**Do not run the API locally** – you will use the Railway API.

---

## Flow
- Field Agent submits → POST to **Railway API** → saves to **Railway Database**
- Data Validator opens Agroforestry app → fetches from **Railway API** → sees Farmer Records

---

## If the API runs locally (alternative)

If you run `npm run dev` (API + field-agent locally), the **local API** must connect to Railway DB.

### api/.env must have:

```
DATABASE_PUBLIC_URL=postgres://postgres:xxx@xxx.railway.app:5432/railway
```

Get this from Railway: PostgreSQL service → Connect → **Public URL** (not the private one).

---

## Quick check
- Railway API health: `https://your-api.up.railway.app/health` → `{"ok":true}`
- Railway API DB: `https://your-api.up.railway.app/ready` → `{"ok":true,"db":"connected"}`
