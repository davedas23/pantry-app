// src/db.js
// All Firestore operations live here — swap this file to change backends

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION = "pantry_items";

// Subscribe to real-time updates. Calls onChange(items[]) whenever
// any item is added, changed, or deleted — on any device.
export function subscribeToItems(onChange) {
  const ref = collection(db, COLLECTION);
  return onSnapshot(ref, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort by expiry client-side (avoids needing a Firestore index)
    items.sort((a, b) => {
      const da = a.expiry ? new Date(a.expiry) : new Date("9999-01-01");
      const db2 = b.expiry ? new Date(b.expiry) : new Date("9999-01-01");
      return da - db2;
    });
    onChange(items);
  });
}

export async function addItem(item) {
  return addDoc(collection(db, COLLECTION), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateItem(id, item) {
  return updateDoc(doc(db, COLLECTION, id), {
    ...item,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItem(id) {
  return deleteDoc(doc(db, COLLECTION, id));
}
