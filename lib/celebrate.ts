import { create } from "zustand";

type Celebration = { id: number; big: string; small: string };

type Store = {
  current: Celebration | null;
  fire: (big: string, small: string) => void;
  clear: () => void;
};

let nextId = 1;

/** Perayaan singkat (letusan kancing + angka besar) saat poin masuk atau voucher terbit. */
export const useCelebration = create<Store>((set) => ({
  current: null,
  fire: (big, small) => set({ current: { id: nextId++, big, small } }),
  clear: () => set({ current: null }),
}));
