"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Kancing } from "./icons";

const colors = ["text-thread", "text-fill", "text-ink", "text-thread", "text-denim"];

/**
 * Letusan kancing saat poin masuk. Sudut dan jarak dihitung dari indeks, bukan acak,
 * supaya render tetap murni. Tidak ditampilkan bila pengguna meminta gerak dikurangi.
 */
export function Burst({ count = 16 }: { count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const distance = 90 + (i % 3) * 38;
        return (
          <motion.span
            key={i}
            className={`absolute ${colors[i % colors.length]}`}
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance + 24,
              scale: 1,
              opacity: 0,
              rotate: (i % 2 ? 1 : -1) * 220,
            }}
            transition={{ duration: 1.1, ease: "easeOut", delay: (i % 4) * 0.03 }}
          >
            <Kancing size={14 + (i % 3) * 4} className="[--kancing-hole:var(--paper)]" />
          </motion.span>
        );
      })}
    </div>
  );
}
