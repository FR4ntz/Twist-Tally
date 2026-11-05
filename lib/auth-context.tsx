"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useDoc } from "./hooks";
import type { UserDoc, WithId } from "./types";

type AuthState = {
  user: User | null;
  profile: WithId<UserDoc> | null;
  isAdmin: boolean;
  /** true selama status login atau profil belum diketahui */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

let registrationInFlight = false;

async function createProfile(user: User, name: string) {
  await setDoc(doc(db, "users", user.uid), {
    name,
    email: user.email ?? "",
    points: 0,
    lifetimePoints: 0,
    totalBottles: 0,
    createdAt: serverTimestamp(),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<{ user: User | null; ready: boolean }>({ user: null, ready: false });

  useEffect(() => onAuthStateChanged(auth, (user) => setAuthState({ user, ready: true })), []);

  const uid = authState.user?.uid ?? null;
  const profileDoc = useDoc<UserDoc>(uid ? `users/${uid}` : null);
  const adminDoc = useDoc<Record<string, never>>(uid ? `admins/${uid}` : null);

  const profileMissing = profileDoc.data === null;
  useEffect(() => {
    const user = authState.user;
    if (!user || !profileMissing || registrationInFlight) return;
    const fallback = user.displayName || user.email?.split("@")[0] || "Pengguna";
    createProfile(user, fallback).catch(() => {});
  }, [authState.user, profileMissing]);

  const value = useMemo<AuthState>(() => {
    const user = authState.user;
    const loading = !authState.ready || (user !== null && (profileDoc.loading || adminDoc.loading || profileMissing));
    return {
      user,
      profile: profileDoc.data ?? null,
      isAdmin: Boolean(adminDoc.data),
      loading,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      register: async (name, email, password) => {
        registrationInFlight = true;
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: name });
          await createProfile(cred.user, name);
        } finally {
          registrationInFlight = false;
        }
      },
      logOut: () => signOut(auth),
    };
  }, [authState, profileDoc.data, profileDoc.loading, adminDoc.data, adminDoc.loading, profileMissing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}

export function authErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email atau kata sandi tidak cocok. Periksa lagi, lalu coba masuk.";
    case "auth/email-already-in-use":
      return "Email ini sudah terdaftar. Pakai tab Masuk untuk membuka akunnya.";
    case "auth/weak-password":
      return "Kata sandi terlalu pendek. Pakai minimal 6 karakter.";
    case "auth/invalid-email":
      return "Format email belum benar. Contoh: nama@kampus.ac.id";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.";
    case "auth/network-request-failed":
      return "Koneksi internet terputus. Cek jaringan, lalu coba lagi.";
    default:
      return "Gagal memproses akun. Coba lagi sebentar lagi.";
  }
}
