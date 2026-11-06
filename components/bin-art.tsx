"use client";

import { AnimatePresence, motion } from "framer-motion";

const CAPACITY = 12;
const COLS = 3;

/** Satu botol mini: tutup, badan bening, label gingham. Digambar di ruang 120x300 lalu diperkecil. */
function MiniBottle() {
  return (
    <g>
      <rect x="42" y="3" width="36" height="24" rx="5" fill="#1d2158" />
      <path
        d="M44 35H76C77 54 102 60 102 94V268C102 285 92 294 76 294H44C28 294 18 285 18 268V94C18 60 43 54 44 35Z"
        fill="#dce5f3"
        stroke="#fbf8f1"
        strokeWidth="12"
        strokeLinejoin="round"
      />
      <rect x="18" y="130" width="84" height="74" fill="#2a5090" opacity="0.85" />
    </g>
  );
}

/**
 * Tempat sampah pintar: jendela di badan menunjukkan botol yang menumpuk sesuai persen isi.
 * `drop` memicu satu botol jatuh lewat celah tutup (dipakai simulator dan demo di halaman depan).
 */
export function BinArt({
  percent,
  drop,
  className,
}: {
  percent: number;
  drop?: { id: number } | null;
  className?: string;
}) {
  const count = Math.min(CAPACITY, Math.round((percent / 100) * CAPACITY));

  return (
    <svg
      viewBox="12 44 176 204"
      role="img"
      aria-label={`Tempat sampah terisi ${percent} persen`}
      className={className}
    >
      <rect x="30" y="236" width="14" height="10" rx="3" fill="#1d2158" />
      <rect x="156" y="236" width="14" height="10" rx="3" fill="#1d2158" />
      <rect x="26" y="74" width="148" height="164" rx="14" fill="#2a5090" />
      <rect
        x="34"
        y="82"
        width="132"
        height="148"
        rx="9"
        fill="none"
        stroke="#fbf8f1"
        strokeOpacity="0.5"
        strokeWidth="2"
        strokeDasharray="6 5"
      />

      <rect x="50" y="96" width="100" height="108" rx="8" fill="#0d1024" opacity="0.45" />
      <svg x="50" y="96" width="100" height="108" viewBox="0 0 100 108" overflow="hidden">
        {Array.from({ length: count }, (_, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          return (
            <motion.g
              key={i}
              initial={{ y: -90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 170, damping: 15, delay: Math.min(i, 8) * 0.03 }}
            >
              <g transform={`translate(${12 + col * 30} ${108 - 4 - (row + 1) * 26}) scale(0.085)`}>
                <MiniBottle />
              </g>
            </motion.g>
          );
        })}
      </svg>

      <rect x="18" y="54" width="164" height="26" rx="8" fill="#1d2158" />
      <rect x="68" y="62" width="64" height="9" rx="4.5" fill="#0d1024" />
      <circle cx="36" cy="67" r="5" fill="#e8a317" />
      <circle cx="164" cy="67" r="5" fill="#e8a317" />

      <rect x="62" y="208" width="76" height="20" rx="4" fill="#fbf8f1" />
      <text x="100" y="223" textAnchor="middle" fontSize="15" fontWeight="900" fill="#1d2158" fontFamily="var(--font-londrina), sans-serif">
        {percent}%
      </text>

      <AnimatePresence>
        {drop && (
          <motion.g
            key={drop.id}
            initial={{ y: -70, opacity: 1, rotate: -25 }}
            animate={{ y: 44, opacity: 0, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeIn" }}
            style={{ transformOrigin: "100px 40px" }}
          >
            <g transform="translate(90 20) scale(0.085)">
              <MiniBottle />
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}
