# The Pantry App — Deployment Guide

A shared, real-time pantry inventory tracker for two iPhones.
Barcode scanning · Firebase sync · Installable as a home screen app.

---

## What you'll need

- A Google account (for Firebase)
- A GitHub account (free) — github.com
- A Vercel account (free) — vercel.com
- About 45 minutes

---

## PART 1 — Set up Firebase (your database)

### 1.1 Create a Firebase project

1. Go to **console.firebase.google.com**
2. Click **"Add project"**
3. Name it `pantry-app` (or anything you like)
4. Disable Google Analytics (not needed) → **Create project**

### 1.2 Create a Firestore database

1. In your project sidebar, click **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll secure it later)
4. Pick any region (us-east1 is fine) → **Enable**

### 1.3 Get your config keys

1. Click the **gear icon** (top left) → **Project settings**
2. Scroll to **"Your apps"** → click the **Web** icon `</>`
3. Register the app (name it anything) — skip Firebase Hosting
4. Copy the `firebaseConfig` object that appears. It looks like:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

5. Open `src/firebase.js` in this project and **replace the placeholder values**
   with your actual values.

### 1.4 Set Firestore security rules

1. In Firestore → **Rules** tab
2. Replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pantry_items/{item} {
      allow read, write: if true;
    }
  }
}
```

3. Click **Publish**

> ⚠️ This allows anyone with your URL to read/write. That's fine for a
> private family app. If you ever want to add login protection, Firebase
> Authentication can be added later.

---

## PART 2 — Deploy to GitHub + Vercel

### 2.1 Push to GitHub

1. Create a new **private** repository on github.com (name it `pantry-app`)
2. In your terminal, from this project folder:

```bash
git init
git add .
git commit -m "Initial pantry app"
git remote add origin https://github.com/YOUR_USERNAME/pantry-app.git
git push -u origin main
```

### 2.2 Deploy on Vercel

1. Go to **vercel.com** → **"Add New Project"**
2. Import your `pantry-app` GitHub repository
3. Vercel auto-detects it as a React app — leave all settings as defaults
4. Click **Deploy**
5. In ~2 minutes you'll get a URL like `pantry-app-abc123.vercel.app`

> 💡 Every time you push a change to GitHub, Vercel auto-redeploys. 
> No manual steps needed after this.

---

## PART 3 — Install on your iPhones (as a home screen app)

Do this on **both** iPhones.

1. Open **Safari** (must be Safari, not Chrome)
2. Go to your Vercel URL
3. Tap the **Share button** (the box with an arrow at the bottom)
4. Tap **"Add to Home Screen"**
5. Name it **"Pantry"** → tap **Add**

It will appear on your home screen with a full-screen dark interface,
no Safari chrome. Feels like a native app.

---

## PART 4 — Barcode scanning (iPhone setup)

The app uses your iPhone's camera through the browser.

When you tap **Scan Barcode** for the first time:
1. Safari will ask for camera permission → tap **Allow**
2. Point the camera at any grocery barcode (UPC, EAN-13)
3. It reads automatically — no button press needed
4. The product name and category auto-fill from Open Food Facts

**If a product isn't found:** The database has millions of items but
won't have everything. Just fill in the name manually — it takes 2 seconds.

---

## How the sync works

```
Your iPhone  ←──────────────────────────────→  Wife's iPhone
     ↕                                               ↕
  Local cache (instant)              Local cache (instant)
     ↕                                               ↕
  Firebase Firestore  ←──────────────────────→  Firebase Firestore
         (changes appear on both phones in < 1 second)
```

- Changes are **instant** — no refresh needed
- Works **offline** — edits queue up and sync when back online
- The green dot in the top right confirms live sync is active

---

## File structure (for reference)

```
pantry-app/
├── public/
│   ├── index.html          ← PWA shell
│   └── manifest.json       ← Makes it installable on home screen
├── src/
│   ├── firebase.js         ← ⚠️ PUT YOUR FIREBASE KEYS HERE
│   ├── db.js               ← All Firestore read/write logic
│   ├── barcodeLookup.js    ← Open Food Facts API integration
│   ├── App.jsx             ← Main app UI
│   ├── index.js            ← React entry point
│   └── components/
│       ├── ItemModal.jsx   ← Add/Edit form with barcode flow
│       └── BarcodeScanner.jsx ← Camera scanner component
├── package.json
└── README.md               ← This file
```

---

## Adding icons (optional but nice)

The app needs two icon images for the home screen:
- `public/icon-192.png` — 192×192 px
- `public/icon-512.png` — 512×512 px

Make something simple in any image editor (a pantry shelf emoji on a
dark background works great). Drop them in the `public/` folder and
redeploy.

---

## Troubleshooting

**App won't connect to database**
→ Double-check your `src/firebase.js` values match exactly what's in Firebase console.

**Barcode scanner asks for camera but nothing happens**
→ Must use Safari on iPhone. Chrome on iOS doesn't support camera APIs the same way.

**Product not found after scanning**
→ Normal for store brands or generic items. Fill in manually.

**Changes not showing on wife's phone**
→ Check the green dot is showing (live sync). If it's yellow, the app is
  reconnecting — changes will sync once the connection restores.

**Vercel deploy fails**
→ Make sure all files are committed and pushed to GitHub.
  Check the Vercel build log for the specific error.

---

## Firebase free tier limits

Firebase's Spark (free) plan includes:
- **50,000 reads/day**
- **20,000 writes/day**
- **20,000 deletes/day**

A pantry app will use maybe 50–100 operations per day. You'll never
come close to the limit.
