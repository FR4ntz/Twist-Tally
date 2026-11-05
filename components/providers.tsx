"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { create } from "zustand";
import { AuthProvider } from "@/lib/auth-context";
import { Icon } from "./icons";
import { cn } from "./ui";

type Toast = { id: number; tone: "ok" | "error"; text: string };

type ToastStore = {
  toasts: Toast[];
  push: (tone: Toast["tone"], text: string) => void;
  dismiss: (id: number) => void;
};

let nextToastId = 1;

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (tone, text) => {
    const id = nextToastId++;
    set({ toasts: [...get().toasts, { id, tone, text }] });
    setTimeout(() => get().dismiss(id), 5000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  ok: (text: string) => useToasts.getState().push("ok", text),
  error: (text: string) => useToasts.getState().push("error", text),
};

function ToastHost() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[60] mx-auto flex w-full max-w-md flex-col gap-2 px-4"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-[12px] border-2 px-4 py-3 text-sm font-bold",
              t.tone === "ok" ? "border-ink bg-card text-ink" : "border-danger bg-danger-soft text-ink",
            )}
          >
            <span className={cn("mt-0.5 shrink-0", t.tone === "ok" ? "text-denim" : "text-danger")}>
              <Icon name={t.tone === "ok" ? "check" : "warning"} size={18} />
            </span>
            <span className="flex-1">{t.text}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Tutup pesan"
              className="-m-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-paper-deep"
            >
              <Icon name="close" size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        {children}
        <ToastHost />
      </AuthProvider>
    </MotionConfig>
  );
}

type Theme = "light" | "dark";

function subscribeTheme(callback: () => void) {
  window.addEventListener("tt-theme", callback);
  return () => window.removeEventListener("tt-theme", callback);
}

export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  const theme = useSyncExternalStore<Theme>(
    subscribeTheme,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );
  const setTheme = (next: Theme) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("tt-theme", next);
    } catch {
      // penyimpanan diblokir, tema tetap berlaku untuk sesi ini
    }
    window.dispatchEvent(new Event("tt-theme"));
  };
  return { theme, setTheme };
}
