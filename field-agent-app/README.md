# Field Agent App (APK)

Standalone Field Agent app for the Agroforestry Farmer Verification system. This app is built as an **Android APK** using Capacitor. The rest of the system (Validator, Officer, Admin) remains **web-only**.

## Prerequisites

- Node.js 18+
- Android Studio (for building the APK)
- JDK 17

## Setup & build APK

```bash
# Install dependencies
npm install

# Add Android platform (first time only)
npx cap add android

# Build web assets and sync to native project
npm run build
npx cap sync android

# Open in Android Studio to build signed APK
npx cap open android
```

In Android Studio:

1. **Build → Build Bundle(s) / APK(s) → Build APK(s)** for a debug APK, or  
2. **Build → Generate Signed Bundle / APK** for a release APK to distribute.

The APK will be in `android/app/build/outputs/apk/`.

## Development (view Field Agent screens in browser)

From the **`field-agent-app`** folder:

```bash
npm run dev
```

Then open **http://localhost:4200/** in your browser. You’ll see:

- **Dashboard** – stats and recent records
- **Register Farmer** – multi-step registration form (sidebar or “Register New Farmer”)
- **My Submissions** – same dashboard view

After changing code, if you’re also building the APK, run:

```bash
npm run build && npx cap sync android
```

## Routes (in-app)

- `/` – Dashboard  
- `/register` – Register new farmer  
- `/submissions` – My submissions (same view as dashboard)

Uses **HashRouter** so routing works inside the native WebView.
