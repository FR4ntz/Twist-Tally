"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Latar gelombang bernuansa lipatan kain lembut dengan warna tema (--denim, --thread, --paper-deep).
 */
export function FabricBackdrop({ variant = "subtle" }: { variant?: "hero" | "subtle" }) {
  const reduce = useReducedMotion();
  const isHero = variant === "hero";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* Gelombang kain denim utama */}
      <motion.svg
        viewBox="0 0 1200 500"
        preserveAspectRatio="none"
        className="absolute -bottom-8 left-0 h-full w-[115%] opacity-45"
        animate={
          reduce
            ? undefined
            : {
                x: [0, -28, 0],
                y: [0, 8, 0],
              }
        }
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M0 330 C220 260, 440 410, 690 315 C920 230, 1080 340, 1250 280 L1250 520 L0 520 Z"
          fill="var(--denim-soft)"
          opacity={isHero ? "0.75" : "0.45"}
        />
        <path
          d="M0 375 C260 310, 510 440, 770 355 C990 285, 1120 385, 1260 330"
          fill="none"
          stroke="var(--denim)"
          strokeWidth={isHero ? "3" : "2"}
          opacity="0.24"
        />
      </motion.svg>

      {/* Pita aksen serat keemasan yang mengalir lembut */}
      <motion.svg
        viewBox="0 0 1200 500"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-[112%]"
        animate={
          reduce
            ? undefined
            : {
                x: [-18, 12, -18],
                y: [0, -6, 0],
              }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M-40 165 C220 225, 480 95, 760 175 C980 235, 1120 120, 1260 165"
          fill="none"
          stroke="var(--thread)"
          strokeWidth={isHero ? "4.5" : "3"}
          opacity={isHero ? "0.42" : "0.24"}
        />
        <path
          d="M-40 185 C240 245, 500 115, 780 195 C990 250, 1140 140, 1260 182"
          fill="none"
          stroke="var(--denim)"
          strokeWidth="2"
          opacity={isHero ? "0.3" : "0.18"}
        />
      </motion.svg>
    </div>
  );
}
