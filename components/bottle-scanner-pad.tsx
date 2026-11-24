"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { readBottle, sortTiers } from "@/lib/points";
import type { PointTier } from "@/lib/types";
import { Bottle } from "./bottle-art";
import { Icon } from "./icons";
import { Button, Chip, Points, cn } from "./ui";

const MAX_DISPLAY_CM = 35;

export function BottleScannerPad({
  liveHeightCm,
  liveDistanceCm,
  sensorOnline = false,
  sourceLabel,
  sampahId,
  tiers,
  buttonLabel = "Deteksi Ukuran Botol",
  disabled = false,
  loading = false,
  onDetect,
  className,
}: {
  liveHeightCm: number | null;
  liveDistanceCm?: number | null;
  sensorOnline?: boolean;
  sourceLabel?: string;
  sampahId?: string;
  tiers: PointTier[];
  buttonLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  onDetect: (heightCm: number) => void | Promise<void>;
  className?: string;
}) {
  const sorted = sortTiers(tiers);
  const [scanning, setScanning] = useState(false);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, []);

  const hasLiveBottle = liveHeightCm !== null && Number.isFinite(liveHeightCm) && liveHeightCm >= 5;
  const activeHeight = hasLiveBottle ? Math.min(60, Math.round(liveHeightCm * 10) / 10) : null;
  const reading = activeHeight !== null ? readBottle(activeHeight, sorted) : null;

  const clampedDisplay = activeHeight !== null ? Math.min(MAX_DISPLAY_CM, Math.max(5, activeHeight)) : 0;
  const bottlePixelHeight = activeHeight !== null ? Math.round(54 + ((clampedDisplay - 5) / (MAX_DISPLAY_CM - 5)) * 108) : 0;
  const rulerPercent = activeHeight !== null ? Math.min(100, Math.max(8, (clampedDisplay / MAX_DISPLAY_CM) * 100)) : 0;

  function triggerDetect() {
    if (activeHeight === null || activeHeight < 5 || disabled || loading || scanning) return;
    setScanning(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(25);
    const captured = Math.round(activeHeight * 10) / 10;
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => {
      setScanning(false);
      void onDetect(captured);
    }, 480);
  }

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={hasLiveBottle ? "denim" : sensorOnline ? "thread" : "plain"}>
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full",
                hasLiveBottle ? "bg-thread" : sensorOnline ? "bg-ink" : "bg-edge",
              )}
            />
            {hasLiveBottle ? "Botol terdeteksi di alas" : sensorOnline ? sourceLabel ?? "Sensor aktif" : sourceLabel ?? "Sensor belum terhubung"}
          </Chip>
          {sampahId && <Chip tone="plain">ID {sampahId}</Chip>}
        </div>
        {liveDistanceCm != null && Number.isFinite(liveDistanceCm) && (
          <span className="font-mono text-xs font-bold text-ink-soft">Jarak pantul: {liveDistanceCm.toFixed(1)} cm</span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-[14px] border border-edge/40 bg-paper-deep/85 px-4 pb-4 pt-6">
        <div className="mx-auto flex w-fit flex-col items-center">
          <div className="flex items-center gap-2.5 rounded-[10px] bg-ink px-3 py-1.5 text-paper">
            <span className="size-3 rounded-full border-2 border-paper/70 bg-paper/20" aria-hidden="true" />
            <span className="text-[11px] font-bold tracking-wider uppercase">HC-SR04</span>
            <span className="size-3 rounded-full border-2 border-paper/70 bg-paper/20" aria-hidden="true" />
          </div>

          <div className="relative flex h-6 w-24 items-start justify-center overflow-visible" aria-hidden="true">
            {scanning && (
              <>
                <motion.span
                  className="absolute top-0 h-3 w-10 rounded-b-full border-b-2 border-dashed border-thread"
                  animate={{ y: [0, 14], opacity: [0.95, 0], scale: [0.6, 1.35] }}
                  transition={{ duration: 0.45, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.span
                  className="absolute top-0 h-3 w-10 rounded-b-full border-b-2 border-dashed border-denim"
                  animate={{ y: [0, 14], opacity: [0.8, 0], scale: [0.6, 1.35] }}
                  transition={{ duration: 0.45, repeat: Infinity, delay: 0.2, ease: "easeOut" }}
                />
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {scanning && (
            <motion.div
              aria-hidden="true"
              initial={{ top: "2.8rem", opacity: 0.9 }}
              animate={{ top: "calc(100% - 1.5rem)", opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-x-4 z-20 h-1 rounded-full bg-thread"
            />
          )}
        </AnimatePresence>

        <div className="relative mt-1 grid h-52 grid-cols-[1fr_4.5rem] items-end gap-2">
          <div className="relative flex h-full flex-col items-center justify-end">
            <AnimatePresence mode="wait">
              {activeHeight !== null ? (
                <motion.div
                  key="bottle-on-pad"
                  initial={{ y: -24, opacity: 0, scale: 0.92 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 12, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="relative flex flex-col items-center"
                >
                  <motion.div
                    layout
                    className="mb-1 rounded-[8px] bg-ink px-2.5 py-0.5 font-mono text-xs font-bold text-paper"
                  >
                    {activeHeight.toFixed(1)} cm
                  </motion.div>
                  <motion.div
                    animate={{ height: bottlePixelHeight }}
                    transition={{ type: "spring", stiffness: 220, damping: 22 }}
                    className="flex items-end justify-center overflow-visible"
                  >
                    <Bottle height={bottlePixelHeight} />
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-pad"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 flex flex-col items-center gap-2 text-center"
                >
                  <div className="grid size-16 place-items-center rounded-[12px] border border-edge/45 bg-card text-ink-soft">
                    <Icon name="bottle" size={30} />
                  </div>
                  <p className="max-w-[12rem] text-xs font-bold text-ink-soft">
                    {sensorOnline
                      ? "Taruh botol di atas alas agar sensor membaca tingginya"
                      : "Hubungkan Arduino USB lalu taruh botol di atas alas"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-1 h-3.5 w-40 rounded-full border-2 border-ink bg-denim shadow-[0_3px_0_var(--ink)]" aria-hidden="true">
              <span className="block h-full w-full rounded-full border-b border-on-fill/40" />
            </div>
          </div>

          <div className="relative h-full border-l-2 border-edge/35 pl-2 text-[11px] font-bold text-ink-soft" aria-hidden="true">
            {[35, 25, 18, 10, 0].map((cm) => (
              <div
                key={cm}
                className="absolute left-0 flex w-full items-center gap-1"
                style={{ bottom: `${(cm / MAX_DISPLAY_CM) * 100}%`, transform: "translateY(50%)" }}
              >
                <span className="h-0.5 w-2 bg-edge" />
                <span className="font-mono">{cm}cm</span>
              </div>
            ))}
            {activeHeight !== null && (
              <motion.div
                animate={{ bottom: `${rulerPercent}%` }}
                transition={{ type: "spring", stiffness: 240, damping: 24 }}
                className="absolute -left-[5px] size-2.5 translate-y-1/2 rounded-full bg-thread ring-2 ring-ink"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-[12px] bg-card p-3 text-center">
        <div>
          <p className="text-xs text-ink-soft">Tinggi</p>
          <p className="font-display text-2xl font-black leading-tight tabular-nums">
            {reading ? `${reading.heightCm.toFixed(1)} cm` : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Kategori</p>
          <p className="font-display text-2xl font-black leading-tight text-denim">{reading ? reading.tier : "-"}</p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Estimasi</p>
          <div className="mt-0.5 flex justify-center">
            {reading ? <Points value={reading.points} size={18} className="text-xl" /> : <span className="font-display text-2xl font-black">-</span>}
          </div>
        </div>
      </div>

      <Button
        variant="thread"
        loading={loading || scanning}
        disabled={disabled || activeHeight === null}
        onClick={triggerDetect}
        className="min-h-14 w-full text-lg shadow-[0_3px_0_var(--ink)]"
      >
        <Icon name="scan" size={22} />
        {scanning ? "Memindai alas..." : buttonLabel}
      </Button>
    </div>
  );
}
