"use client";

import { formatCountdown } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import type { Timestamp } from "firebase/firestore";

/**
 * Cincin hitung mundur. Sisa waktu selalu ditulis sebagai angka; warna hanya penguat:
 * cincin berubah merah di 30 detik terakhir.
 */
export function Countdown({
  expiresAt,
  totalMs,
  size = 56,
  label,
}: {
  expiresAt: Timestamp;
  totalMs: number;
  size?: number;
  label?: string;
}) {
  const now = useNow(250);
  const left = Math.max(0, expiresAt.toMillis() - now);
  const ratio = totalMs > 0 ? Math.min(1, left / totalMs) : 0;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const urgent = left <= 30_000;

  return (
    <div
      role="timer"
      aria-label={label ? `${label}: sisa ${formatCountdown(left)}` : `Sisa ${formatCountdown(left)}`}
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--stitch)" strokeWidth="4" strokeDasharray="4 4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={urgent ? "var(--danger)" : "var(--denim)"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <span className={`absolute text-[0.8rem] font-black tabular-nums ${urgent ? "text-danger" : ""}`}>{formatCountdown(left)}</span>
    </div>
  );
}
