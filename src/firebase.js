// src/firebase.js
// ─────────────────────────────────────────────────────────────
// STEP 1: Replace these values with your Firebase project config
// Go to: console.firebase.google.com → Your Project →
//         Project Settings → General → Your Apps → Web App
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDT018tjCJ3bvQxq61fz4q_udcl25dtCY0",
  authDomain: "pantry-app-187a8.firebaseapp.com",
  projectId: "pantry-app-187a8",
  storageBucket: "pantry-app-187a8.firebasestorage.app",
  messagingSenderId: "521568348774",
  appId: "1:521568348774:web:47a3b03af593b91f661ba7"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline persistence so the app works without internet
// and syncs automatically when connection is restored
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    // Multiple tabs open — persistence only works in one tab at a time
    console.warn("Offline persistence unavailable: multiple tabs open");
  } else if (err.code === "unimplemented") {
    console.warn("Offline persistence not supported in this browser");
  }
});
