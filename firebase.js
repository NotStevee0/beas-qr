import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";

const env = import.meta.env;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const dbEnabled = Boolean(config.apiKey && config.projectId && config.appId);

let db = null;
if (dbEnabled) {
  try {
    db = getFirestore(initializeApp(config));
  } catch (e) {
    console.error("Firebase init failed", e);
  }
}

export const dbReady = () => db !== null;

export async function saveRecord(rec) {
  if (!db) return null;
  const ref = await addDoc(collection(db, "qrcodes"), {
    grno: rec.grno,
    name: rec.name,
    centre: rec.centre,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function removeRecord(id) {
  if (!db) return;
  await deleteDoc(doc(db, "qrcodes", id));
}

export function watchRecords(onData, onError) {
  if (!db) return () => {};
  const q = query(collection(db, "qrcodes"), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}
