import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

function createDb(app: FirebaseApp): Firestore {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    // Hot reload memanggil modul ini lagi setelah Firestore sudah diinisialisasi.
    return getFirestore(app);
  }
}

const app = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(config)) : null;

// Tanpa konfigurasi, Providers menampilkan halaman galat dan tidak ada kode yang menyentuh dua objek ini.
export const auth = (app ? getAuth(app) : null) as Auth;
export const db = (app ? createDb(app) : null) as Firestore;
