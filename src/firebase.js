import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, deleteDoc, doc, setDoc, onSnapshot,
  query, orderBy, limit, increment,
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
  try { db = getFirestore(initializeApp(config)); } catch (e) { console.error("Firebase init failed", e); }
}
export const dbReady = () => db !== null;

/* ---- shared scan history (visible to everyone) ---- */
export async function addScan(rec) {
  if (!db) return null;
  const ref = await addDoc(collection(db, "scans"), {
    text: rec.text, raw: rec.raw ?? rec.text, format: rec.format ?? "", time: Date.now(),
  });
  return ref.id;
}
export async function removeScan(id) {
  if (db) await deleteDoc(doc(db, "scans", id));
}
export function watchScans(onData, onError) {
  if (!db) return () => {};
  const q = query(collection(db, "scans"), orderBy("time", "desc"), limit(200));
  return onSnapshot(q, (s) => onData(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => onError && onError(e));
}

/* ---- visitor counter ---- */
export async function countVisit() {
  if (db) await setDoc(doc(db, "meta", "stats"), { visitors: increment(1) }, { merge: true });
}
export function watchVisitors(onData) {
  if (!db) return () => {};
  return onSnapshot(doc(db, "meta", "stats"), (s) => onData(s.exists() ? s.data().visitors || 0 : 0), () => {});
}
