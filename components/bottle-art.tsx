"use client";

import { useId } from "react";
import { motion } from "framer-motion";

/*
  Botol PET dibalut pita kain tenun twill denim & linen.
*/
export function Bottle({ height, className }: { height: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const weave = `weave-${uid}`;
  const clip = `clip-${uid}`;
  const body =
    "M44 35H76C77 54 102 60 102 94V268C102 285 92 294 76 294H44C28 294 18 285 18 268V94C18 60 43 54 44 35Z";

  return (
    <svg
      viewBox="0 0 120 300"
      width={Math.round(height * 0.4)}
      height={height}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <pattern id={weave} patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(35)">
          <rect width="12" height="12" fill="var(--denim)" />
          <rect width="6" height="12" fill="var(--card)" opacity="0.22" />
          <rect width="12" height="4" fill="var(--ink)" opacity="0.2" />
        </pattern>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>

      <rect x="42" y="3" width="36" height="24" rx="5" fill="var(--ink)" />
      {[50, 56, 62, 68, 74].map((x) => (
        <path key={x} d={`M${x - 3} 8V22`} stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      ))}
      <rect x="38" y="29" width="44" height="6" rx="3" fill="var(--ink)" opacity="0.85" />

      <path d={body} fill="var(--denim-soft)" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />

      <g clipPath={`url(#${clip})`}>
        <path d="M30 100V258" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
        <path d="M18 236H102M18 250H102" stroke="var(--ink)" strokeWidth="2" opacity="0.25" />
        {/* Pita kain tenun melingkar di botol */}
        <rect x="14" y="128" width="92" height="74" fill={`url(#${weave})`} stroke="var(--ink)" strokeWidth="3" />
        <rect x="14" y="136" width="92" height="6" fill="var(--thread)" opacity="0.92" />
        <rect x="14" y="188" width="92" height="6" fill="var(--thread)" opacity="0.92" />
      </g>

      {/* Emblem lipatan kain kecil */}
      <rect x="44" y="150" width="32" height="28" rx="6" fill="var(--card)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M51 160h18M51 166h14M51 172h10" stroke="var(--denim)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

const sizes = [
  { label: "kecil", height: 150 },
  { label: "sedang", height: 210 },
  { label: "besar", height: 275 },
];

export function BottleTrio({ scale = 1, className }: { scale?: number; className?: string }) {
  return (
    <div
      role="img"
      aria-label="Tiga botol plastik berukuran kecil, sedang, dan besar"
      className={className}
    >
      <div className="relative flex items-end justify-center gap-3 sm:gap-5">
        {sizes.map((size, i) => (
          <motion.div
            key={size.label}
            initial={{ y: -90, opacity: 0, rotate: i === 1 ? 8 : -6 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 13, delay: 0.1 + i * 0.12 }}
          >
            <Bottle height={Math.round(size.height * scale)} />
          </motion.div>
        ))}
        <span
          aria-hidden="true"
          className="absolute -bottom-2 inset-x-0 border-t-[3px] border-denim/45"
        />
      </div>
    </div>
  );
}
