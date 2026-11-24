"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import type { Timestamp } from "firebase/firestore";
import { ActionError, createUnclaimedDeposit, expireDeposit, publishLiveSensor } from "@/lib/actions";
import { useArduinoSerial } from "@/lib/arduino-serial";
import { useCelebration } from "@/lib/celebrate";
import { fillPercent, formatNumber } from "@/lib/format";
import { useCollection, useDoc, useNow, useOrigin } from "@/lib/hooks";
import { readBottle, sortTiers, tierForHeight, withDefaults } from "@/lib/points";
import type { Bin, Deposit, PointsSettings } from "@/lib/types";
import { BinArt } from "./bin-art";
import { Bottle, BottleTrio } from "./bottle-art";
import { Burst } from "./burst";
import { CelebrationOverlay } from "./claims";
import { Countdown } from "./countdown";
import { Icon } from "./icons";
import { Logo } from "./logo";
import { toast } from "./providers";
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  FillGauge,
  LinkButton,
  LoadingBlock,
  Points,
  cn,
} from "./ui";

const SMOOTH_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const MAX_DISPLAY_CM = 35;

export function AdminDeteksi() {
  const bins = useCollection<Bin>({ path: "bins" });
  const settingsDoc = useDoc<PointsSettings>("settings/points");
  const settings = withDefaults(settingsDoc.data);
  const tiers = sortTiers(settings.tiers);
  const now = useNow(1000);
  const origin = useOrigin();
  const reduceMotion = useReducedMotion();

  const [binId, setBinId] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [demoHeightCm, setDemoHeightCm] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<{
    depositId: string;
    heightCm: number;
    tier: string;
    points: number;
    expiresAt: Timestamp;
    nonce: number;
  } | null>(null);
  const [drop, setDrop] = useState<{ id: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const ticketDoc = useDoc<Deposit>(detected ? `deposits/${detected.depositId}` : null);
  const celebratedTicketRef = useRef<string | null>(null);
  const expiredTicketRef = useRef<string | null>(null);

  const serialStatus = useArduinoSerial((s) => s.status);
  const serialLog = useArduinoSerial((s) => s.log);
  const lastRawLine = useArduinoSerial((s) => s.lastRawLine);
  const liveHeightCm = useArduinoSerial((s) => s.liveHeightCm);
  const liveDistanceCm = useArduinoSerial((s) => s.liveDistanceCm);
  const emptyDistanceCm = useArduinoSerial((s) => s.emptyDistanceCm);
  const initSupport = useArduinoSerial((s) => s.initSupport);
  const connectSerial = useArduinoSerial((s) => s.connect);
  const disconnectSerial = useArduinoSerial((s) => s.disconnect);
  const consumeCurrentBottle = useArduinoSerial((s) => s.consumeCurrentBottle);
  const calibrateEmpty = useArduinoSerial((s) => s.calibrateEmpty);
  const clearCalibration = useArduinoSerial((s) => s.clearCalibration);

  const lastBroadcastRef = useRef<{ at: number; height: number | null }>({ at: 0, height: null });
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initSupport();
    const syncFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFs);
    return () => {
      document.removeEventListener("fullscreenchange", syncFs);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [initSupport]);

  const bin = bins.data?.find((b) => b.id === binId) ?? bins.data?.[0] ?? null;
  const activeBinId = bin?.id ?? null;

  const effectiveHeight = demoMode ? demoHeightCm : liveHeightCm;
  const effectiveDistance = demoMode
    ? demoHeightCm !== null
      ? Math.max(2, Math.round((35 - demoHeightCm) * 10) / 10)
      : null
    : liveDistanceCm;

  const liveTicket = ticketDoc.data;
  const ticketClaimed = liveTicket?.status === "claimed";
  const ticketExpired =
    detected !== null &&
    (liveTicket?.status === "expired" ||
      (!ticketClaimed && (liveTicket?.expiresAt ?? detected.expiresAt).toMillis() <= now));

  useEffect(() => {
    if (!detected || !liveTicket) return;
    if (liveTicket.status === "claimed" && celebratedTicketRef.current !== detected.depositId) {
      celebratedTicketRef.current = detected.depositId;
      useCelebration
        .getState()
        .fire(`+${liveTicket.points}`, `diklaim oleh ${liveTicket.userName ?? "pengunjung"}`);
    }
  }, [detected, liveTicket]);

  useEffect(() => {
    if (!detected || !ticketExpired || ticketClaimed) return;
    if (expiredTicketRef.current === detected.depositId) return;
    expiredTicketRef.current = detected.depositId;
    expireDeposit(detected.depositId).catch(() => {});
  }, [detected, ticketExpired, ticketClaimed]);

  useEffect(() => {
    if (!activeBinId || serialStatus !== "connected" || demoMode) return;
    const nowMs = Date.now();
    const prev = lastBroadcastRef.current;
    const changed =
      (liveHeightCm === null) !== (prev.height === null) ||
      (liveHeightCm !== null && prev.height !== null && Math.abs(liveHeightCm - prev.height) >= 0.4);
    if (!changed && nowMs - prev.at < 1200) return;
    if (nowMs - prev.at < 450 && prev.height !== null && liveHeightCm !== null) return;

    lastBroadcastRef.current = { at: nowMs, height: liveHeightCm };
    if (liveHeightCm === null || liveHeightCm < 3) {
      publishLiveSensor(activeBinId, null).catch(() => {});
      return;
    }
    const reading = readBottle(liveHeightCm, tiers);
    publishLiveSensor(activeBinId, {
      heightCm: liveHeightCm,
      distanceCm: liveDistanceCm,
      tier: reading.tier,
      points: reading.points,
      source: "arduino",
    }).catch(() => {});
  }, [activeBinId, serialStatus, demoMode, liveHeightCm, liveDistanceCm, tiers]);

  if (bins.loading || settingsDoc.loading) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <LoadingBlock label="Menyiapkan panggung deteksi botol..." />
      </div>
    );
  }

  if (bins.error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <ErrorState title="Stasiun deteksi belum bisa dibuka">
          Periksa koneksi internet, lalu muat ulang halaman ini.
        </ErrorState>
      </div>
    );
  }

  if (!bins.data || bins.data.length === 0 || !bin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="mb-4">
          <LinkButton href="/admin" variant="ghost" size="sm">
            <Icon name="back" size={16} />
            Kembali ke Admin
          </LinkButton>
        </div>
        <EmptyState
          title="Belum ada tempat sampah"
          action={
            <LinkButton href="/admin/bin" variant="thread">
              Daftarkan tempat sampah
            </LinkButton>
          }
        >
          Daftarkan minimal satu tempat sampah dulu agar hasil deteksi ukuran botol bisa dibuatkan QR dan dicatat.
        </EmptyState>
      </div>
    );
  }

  const hasLiveBottle = effectiveHeight !== null && Number.isFinite(effectiveHeight) && effectiveHeight >= 3;
  const activeHeight = hasLiveBottle ? Math.min(60, Math.round(effectiveHeight * 10) / 10) : null;
  const reading = activeHeight !== null ? readBottle(activeHeight, tiers) : null;
  const liveTier = activeHeight !== null ? tierForHeight(activeHeight, tiers) : null;
  const clampedDisplay = activeHeight !== null ? Math.min(MAX_DISPLAY_CM, Math.max(3, activeHeight)) : 0;
  const bottlePixelHeight =
    activeHeight !== null ? Math.round(74 + ((clampedDisplay - 3) / (MAX_DISPLAY_CM - 3)) * 142) : 0;
  const rulerPercent =
    activeHeight !== null ? Math.min(100, Math.max(8, (clampedDisplay / MAX_DISPLAY_CM) * 100)) : 0;
  const percent = fillPercent(bin.bottleCount, bin.capacityBottles);

  const flowStep = detected ? 3 : scanning || hasLiveBottle ? 2 : 1;

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Browser tidak mengizinkan fullscreen
    }
  }

  async function handleDisconnect() {
    await disconnectSerial();
    if (activeBinId) publishLiveSensor(activeBinId, null).catch(() => {});
  }

  function triggerScan() {
    if (!bin || activeHeight === null || activeHeight < 3 || scanning) return;
    setScanning(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(25);
    const captured = Math.round(activeHeight * 10) / 10;
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(async () => {
      try {
        const ticket = await createUnclaimedDeposit(bin, [captured], settings);
        const res = readBottle(captured, tiers);
        if (!demoMode) consumeCurrentBottle(false);
        setDemoHeightCm(null);
        setDrop((d) => ({ id: (d?.id ?? 0) + 1 }));
        setDetected({
          depositId: ticket.depositId,
          heightCm: captured,
          tier: res.tier,
          points: ticket.points,
          expiresAt: ticket.expiresAt,
          nonce: Date.now(),
        });
        toast.ok(`QR siap diklaim: ${captured.toFixed(1)} cm (${res.tier}, +${ticket.points} poin).`);
      } catch (error) {
        toast.error(error instanceof ActionError ? error.message : "Gagal membuat tiket QR. Coba lagi.");
      } finally {
        setScanning(false);
      }
    }, 520);
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <CelebrationOverlay />

      {/* Pita gingham khas Twist & Tally di tepi atas */}
      <div className="gingham h-3 w-full border-b-2 border-ink" aria-hidden="true" />

      {/* Bar navigasi panggung penuh */}
      <header className="sticky top-0 z-30 border-b-2 border-dashed border-stitch bg-paper/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <LinkButton href="/admin" variant="ghost" size="sm">
              <Icon name="back" size={16} />
              Panel Admin
            </LinkButton>
            <Logo href="/admin/deteksi" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Pilih tempat sampah aktif"
              value={bin.id}
              onChange={(e) => {
                if (activeBinId) publishLiveSensor(activeBinId, null).catch(() => {});
                setBinId(e.target.value);
                setDetected(null);
              }}
              className="min-h-11 rounded-[10px] border-2 border-edge bg-card px-3 text-sm font-bold text-ink"
            >
              {bins.data.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.sampahId})
                </option>
              ))}
            </select>

            {serialStatus === "connected" ? (
              <Button variant="ghost" size="sm" onClick={handleDisconnect}>
                Putuskan USB
              </Button>
            ) : (
              <Button
                variant="thread"
                size="sm"
                loading={serialStatus === "connecting"}
                disabled={serialStatus === "unsupported"}
                onClick={connectSerial}
              >
                Hubungkan Arduino USB
              </Button>
            )}

            <Button
              variant={demoMode ? "primary" : "ghost"}
              size="sm"
              onClick={() => {
                setDemoMode((prev) => !prev);
                setDemoHeightCm((prev) => (demoMode ? null : prev ?? 21));
              }}
            >
              {demoMode ? "Mode Demo Aktif" : "Mode Demo"}
            </Button>

            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-7 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* Hero Judul & Strip Alur Animasi Pameran */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: SMOOTH_EASE }}
          aria-labelledby="judul-pameran"
          className="gingham relative overflow-hidden rounded-[22px] border-2 border-ink p-5 sm:p-7"
        >
          <div className="patch grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-chip bg-ink px-3 py-1 text-xs font-black uppercase tracking-wider text-paper">
                  <motion.span
                    aria-hidden="true"
                    animate={
                      reduceMotion
                        ? undefined
                        : { scale: [1, 1.45, 1], opacity: [1, 0.45, 1] }
                    }
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className={cn(
                      "size-2.5 rounded-full",
                      serialStatus === "connected" || demoMode ? "bg-thread" : "bg-paper/70",
                    )}
                  />
                  {demoMode
                    ? "Mode Demo Interaktif"
                    : serialStatus === "connected"
                      ? "Sensor Ultrasonik Live"
                      : "Stasiun Pameran Twist & Tally"}
                </span>
                <Chip tone="denim">Unit {bin.sampahId}</Chip>
              </div>

              <h1 id="judul-pameran" className="mt-3 text-5xl leading-[0.95] sm:text-6xl lg:text-[4.25rem]">
                Deteksi Ukuran Botol Pintar
              </h1>
              <p className="mt-3 max-w-xl text-base text-ink-soft sm:text-lg">
                Letakkan botol plastik di atas alas ukur. Sistem membaca tinggi botol secara otomatis, menentukan kategori
                poin, dan menampilkan QR klaim untuk pengunjung.
              </p>
            </div>

            {/* 3 Langkah Interaktif yang menyorot tahap aktif */}
            <ol className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { step: 1, title: "1. Taruh Botol", desc: "Letakkan botol berdiri di alas sensor.", icon: "bottle" as const },
                { step: 2, title: "2. Ukur Tinggi", desc: "Gelombang ultrasonik membaca cm & kategori.", icon: "scan" as const },
                { step: 3, title: "3. Scan QR & Poin", desc: "Pindai QR untuk klaim poin ke akunmu.", icon: "tag" as const },
              ].map((item) => {
                const isCurrent = flowStep === item.step;
                const isDone = flowStep > item.step;
                return (
                  <motion.li
                    key={item.step}
                    animate={isCurrent && !reduceMotion ? { scale: [1, 1.015, 1] } : undefined}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className={cn(
                      "flex items-center gap-3 rounded-[14px] border-2 px-3.5 py-2.5 transition-colors",
                      isCurrent
                        ? "border-ink bg-thread text-thread-ink shadow-[0_3px_0_var(--ink)]"
                        : isDone
                          ? "border-fill bg-denim-soft text-ink"
                          : "border-dashed border-stitch bg-paper-deep/65 text-ink-soft",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-[10px]",
                        isCurrent ? "bg-ink text-paper" : isDone ? "bg-fill text-on-fill" : "bg-card text-ink",
                      )}
                    >
                      <Icon name={isDone ? "check" : item.icon} size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-xl font-black leading-none">{item.title}</span>
                      <span className="mt-0.5 block text-xs font-bold opacity-85">{item.desc}</span>
                    </span>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </motion.section>

        {/* Panggung Utama 2 Kolom */}
        <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
          {/* Kiri: Ruang Ukur Ultrasonik Beranimasi */}
          <section className="patch grid gap-5 p-5 sm:p-7" aria-labelledby="alas-stage">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 id="alas-stage" className="text-3xl sm:text-4xl">
                  Alas Sensor Ultrasonik
                </h2>
                <p role="status" className="text-xs font-bold text-ink-soft">
                  {demoMode
                    ? "Mode demo aktif: atur tinggi botol simulasi di bawah atau tekan tombol deteksi."
                    : serialLog}
                </p>
                {!demoMode && serialStatus === "connected" && lastRawLine && (
                  <p className="mt-1 truncate font-mono text-[11px] font-bold text-denim">
                    Serial: {lastRawLine}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {effectiveDistance !== null && (
                  <Chip tone="denim">Pantul {effectiveDistance.toFixed(1)} cm</Chip>
                )}
                {!demoMode && serialStatus === "connected" && liveDistanceCm !== null && (
                  emptyDistanceCm === null ? (
                    <Button variant="ghost" size="sm" onClick={calibrateEmpty}>
                      Set 0 cm (Alas Kosong)
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={clearCalibration}>
                      Reset Kalibrasi ({emptyDistanceCm.toFixed(1)} cm)
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Chamber Sensor */}
            <div className="relative overflow-hidden rounded-[18px] border-2 border-ink bg-paper-deep/90 px-4 pb-5 pt-6">
              {/* Kepala Transduser HC-SR04 + Gelombang Sonar */}
              <div className="mx-auto flex w-fit flex-col items-center">
                <div className="flex items-center gap-3 rounded-[12px] border-2 border-ink bg-ink px-4 py-2 text-paper shadow-[0_3px_0_var(--thread)]">
                  <motion.span
                    aria-hidden="true"
                    animate={
                      !reduceMotion && (serialStatus === "connected" || demoMode)
                        ? { opacity: [0.55, 1, 0.55] }
                        : undefined
                    }
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="size-3.5 rounded-full border-2 border-paper/80 bg-thread"
                  />
                  <span className="font-mono text-xs font-black tracking-widest uppercase">HC-SR04 SONAR</span>
                  <motion.span
                    aria-hidden="true"
                    animate={
                      !reduceMotion && (serialStatus === "connected" || demoMode)
                        ? { opacity: [0.55, 1, 0.55] }
                        : undefined
                    }
                    transition={{ duration: 1.4, delay: 0.4, repeat: Infinity }}
                    className="size-3.5 rounded-full border-2 border-paper/80 bg-thread"
                  />
                </div>

                {/* Gelombang sonar di bawah sensor */}
                <div className="relative flex h-8 w-32 items-start justify-center overflow-visible" aria-hidden="true">
                  {(scanning || (!reduceMotion && (hasLiveBottle || serialStatus === "connected"))) && (
                    <>
                      <motion.span
                        className={cn(
                          "absolute top-0 h-4 w-12 rounded-b-full border-b-2 border-dashed",
                          scanning ? "border-thread" : "border-denim/70",
                        )}
                        animate={{
                          y: [0, scanning ? 22 : 14],
                          opacity: [0.95, 0],
                          scale: [0.6, scanning ? 1.55 : 1.25],
                        }}
                        transition={{ duration: scanning ? 0.42 : 1.3, repeat: Infinity, ease: "easeOut" }}
                      />
                      <motion.span
                        className={cn(
                          "absolute top-0 h-4 w-12 rounded-b-full border-b-2 border-dashed",
                          scanning ? "border-denim" : "border-thread/70",
                        )}
                        animate={{
                          y: [0, scanning ? 22 : 14],
                          opacity: [0.85, 0],
                          scale: [0.6, scanning ? 1.55 : 1.25],
                        }}
                        transition={{
                          duration: scanning ? 0.42 : 1.3,
                          delay: scanning ? 0.18 : 0.65,
                          repeat: Infinity,
                          ease: "easeOut",
                        }}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Garis Sapu Laser saat tombol Deteksi ditekan */}
              <AnimatePresence>
                {scanning && (
                  <motion.div
                    aria-hidden="true"
                    initial={{ top: "3.5rem", opacity: 0.95 }}
                    animate={{ top: "calc(100% - 1.5rem)", opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.48, ease: "easeInOut" }}
                    className="pointer-events-none absolute inset-x-4 z-20 h-1.5 rounded-full bg-thread shadow-[0_0_12px_var(--thread)]"
                  />
                )}
              </AnimatePresence>

              {/* Area Botol + Penggaris Tinggi */}
              <div className="relative mt-2 grid h-72 grid-cols-[1fr_5rem] items-end gap-3">
                <div className="relative flex h-full flex-col items-center justify-end">
                  <AnimatePresence mode="wait">
                    {activeHeight !== null ? (
                      <motion.div
                        key="live-bottle-stage"
                        initial={{ y: -26, opacity: 0, scale: 0.92 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 12, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 240, damping: 20 }}
                        className="relative flex flex-col items-center"
                      >
                        {/* Lencana tinggi live melayang di atas tutup botol */}
                        <motion.div
                          layout
                          className="mb-1.5 flex items-center gap-1.5 rounded-[10px] border-2 border-ink bg-thread px-3 py-1 font-mono text-sm font-black text-thread-ink shadow-[0_2px_0_var(--ink)]"
                        >
                          <span>{activeHeight.toFixed(1)} cm</span>
                          {liveTier && <span className="opacity-80">({liveTier.label})</span>}
                        </motion.div>

                        <motion.div
                          animate={{ height: bottlePixelHeight }}
                          transition={{ type: "spring", stiffness: 210, damping: 21 }}
                          className="flex items-end justify-center overflow-visible"
                        >
                          <Bottle height={bottlePixelHeight} />
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle-showcase"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mb-3 flex flex-col items-center gap-3 text-center"
                      >
                        <motion.div
                          animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <BottleTrio scale={0.48} />
                        </motion.div>
                        <p className="max-w-xs rounded-[10px] border-2 border-dashed border-edge bg-card/85 px-3 py-1.5 text-xs font-bold text-ink-soft">
                          {serialStatus === "connected"
                            ? "Sensor aktif! Letakkan botol di atas alas untuk mulai mengukur."
                            : "Hubungkan Arduino USB atau nyalakan Mode Demo di kanan atas."}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Alas Timbang Denim */}
                  <div
                    className="mt-1.5 h-4 w-52 rounded-full border-2 border-ink bg-denim shadow-[0_4px_0_var(--ink)]"
                    aria-hidden="true"
                  >
                    <span className="block h-full w-full rounded-full border-b-2 border-dashed border-on-fill/55" />
                  </div>
                </div>

                {/* Skala Penggaris Vertikal */}
                <div
                  className="relative h-full border-l-2 border-dashed border-stitch pl-2.5 text-xs font-bold text-ink-soft"
                  aria-hidden="true"
                >
                  {[35, 25, 18, 10, 0].map((cm) => (
                    <div
                      key={cm}
                      className="absolute left-0 flex w-full items-center gap-1"
                      style={{ bottom: `${(cm / MAX_DISPLAY_CM) * 100}%`, transform: "translateY(50%)" }}
                    >
                      <span className="h-0.5 w-2.5 bg-edge" />
                      <span className="font-mono">{cm} cm</span>
                    </div>
                  ))}
                  {activeHeight !== null && (
                    <motion.div
                      animate={{ bottom: `${rulerPercent}%` }}
                      transition={{ type: "spring", stiffness: 230, damping: 22 }}
                      className="absolute -left-[6px] size-3 translate-y-1/2 rounded-full bg-thread ring-2 ring-ink"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 3 Telemetry Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[12px] border-2 border-dashed border-stitch bg-paper-deep/65 p-3 text-center">
                <p className="text-xs font-bold text-ink-soft">Tinggi</p>
                <p className="mt-0.5 font-display text-3xl font-black leading-none tabular-nums">
                  {reading ? `${reading.heightCm.toFixed(1)} cm` : "-"}
                </p>
              </div>
              <div className="rounded-[12px] border-2 border-dashed border-stitch bg-paper-deep/65 p-3 text-center">
                <p className="text-xs font-bold text-ink-soft">Kategori</p>
                <p className="mt-0.5 font-display text-3xl font-black leading-none text-denim">
                  {reading ? reading.tier : "-"}
                </p>
              </div>
              <div className="rounded-[12px] border-2 border-dashed border-stitch bg-paper-deep/65 p-3 text-center">
                <p className="text-xs font-bold text-ink-soft">Estimasi</p>
                <div className="mt-0.5 flex justify-center">
                  {reading ? (
                    <Points value={reading.points} size={20} className="text-2xl" />
                  ) : (
                    <span className="font-display text-3xl font-black leading-none">-</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tombol Utama Deteksi */}
            <Button
              variant="thread"
              loading={scanning}
              disabled={activeHeight === null}
              onClick={triggerScan}
              className="min-h-16 w-full text-xl shadow-[0_4px_0_var(--ink)]"
            >
              <Icon name="scan" size={24} />
              {scanning ? "Memindai Tinggi Botol..." : "Deteksi Ukuran Botol"}
            </Button>

            {/* Kontrol Cepat Mode Demo (hanya tampil jika Mode Demo diaktifkan) */}
            {demoMode && (
              <div className="grid gap-3 rounded-[14px] border-2 border-dashed border-denim bg-denim-soft/65 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-wider text-ink">
                    Kontrol Simulasi Pameran
                  </p>
                  <button
                    type="button"
                    onClick={() => setDemoHeightCm(null)}
                    className="text-xs font-bold text-denim underline"
                  >
                    Kosongkan alas
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Botol Kecil (12.5 cm)", h: 12.5 },
                    { label: "Botol Sedang (21.0 cm)", h: 21.0 },
                    { label: "Botol Besar (28.5 cm)", h: 28.5 },
                  ].map((preset) => (
                    <Button
                      key={preset.label}
                      variant={demoHeightCm === preset.h ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => setDemoHeightCm(preset.h)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <label className="grid gap-1 text-xs font-bold text-ink-soft">
                  <span>Atur tinggi manual: {demoHeightCm !== null ? `${demoHeightCm.toFixed(1)} cm` : "Kosong"}</span>
                  <input
                    type="range"
                    min={5}
                    max={34}
                    step={0.5}
                    value={demoHeightCm ?? 5}
                    onChange={(e) => setDemoHeightCm(Number(e.target.value))}
                    className="accent-ink"
                  />
                </label>
              </div>
            )}

            {/* Panduan Kategori Ukuran Botol dengan Ikon Proporsional */}
            <div className="grid gap-2 border-t-2 border-dashed border-stitch pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Kategori Poin Botol</p>
              <ul className="grid grid-cols-3 gap-2.5">
                {tiers.map((tier, idx) => {
                  const activeMatch = liveTier?.label === tier.label || detected?.tier === tier.label;
                  const rangeText =
                    tier.upToCm === null
                      ? `> ${tiers[idx - 1]?.upToCm ?? 0} cm`
                      : idx === 0
                        ? `5 - ${tier.upToCm} cm`
                        : `${(tiers[idx - 1]?.upToCm ?? 0) + 1} - ${tier.upToCm} cm`;
                  const previewHeight = idx === 0 ? 30 : idx === 1 ? 40 : 50;
                  return (
                    <motion.li
                      key={tier.label}
                      animate={activeMatch ? { scale: 1.03, y: -2 } : { scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 280, damping: 20 }}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-[12px] border-2 p-2.5 transition-colors",
                        activeMatch
                          ? "border-ink bg-thread text-thread-ink shadow-[0_3px_0_var(--ink)]"
                          : "border-dashed border-stitch bg-paper-deep/60",
                      )}
                    >
                      <Bottle height={previewHeight} className="hidden shrink-0 sm:block" />
                      <div className="text-center sm:text-left">
                        <p className="font-display text-xl font-black leading-none">{tier.label}</p>
                        <p className="mt-0.5 text-[11px] font-bold opacity-85">{rangeText}</p>
                        <p className="mt-1 text-sm font-black">{tier.points} poin</p>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* Kanan: Status Tiket QR Sekali Pakai & Tempat Sampah Pintar */}
          <section className="grid gap-5" aria-live="polite" aria-labelledby="hasil-pameran">
            <h2 id="hasil-pameran" className="sr-only">
              Hasil deteksi dan QR klaim
            </h2>

            {/* Kartu status tiket QR (menggantikan sistem sambungan tempat sampah yang membingungkan) */}
            <div
              className={cn(
                "patch flex items-center justify-between gap-3 p-4 sm:p-5",
                ticketClaimed ? "patch-denim" : "patch-linen",
              )}
            >
              {detected && ticketClaimed && liveTicket ? (
                <>
                  <div className="min-w-0">
                    <Chip tone="thread">Tiket QR Terklaim</Chip>
                    <p className="mt-1.5 truncate font-display text-3xl font-black leading-none">
                      {liveTicket.userName ?? "Pengunjung"}
                    </p>
                    <p className="mt-1 text-xs text-on-fill/85">
                      Poin sudah masuk. QR otomatis hangus untuk pengguna lain.
                    </p>
                  </div>
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-thread text-thread-ink">
                    <Icon name="check" size={24} />
                  </span>
                </>
              ) : detected && ticketExpired ? (
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-danger-soft text-danger">
                    <Icon name="clock" size={22} />
                  </span>
                  <div>
                    <p className="font-display text-xl font-black leading-tight text-danger">QR Sudah Hangus</p>
                    <p className="text-xs text-ink-soft">
                      Waktu klaim habis sebelum dipindai. Deteksi botol lagi untuk membuat QR baru.
                    </p>
                  </div>
                </div>
              ) : detected ? (
                <>
                  <div className="min-w-0">
                    <Chip tone="thread">QR Aktif 1x Klaim</Chip>
                    <p className="mt-1.5 font-display text-2xl font-black leading-tight">Menunggu Scan Pengunjung</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Hanya berlaku untuk penemu pertama sebelum hitung mundur habis.
                    </p>
                  </div>
                  <div className="rounded-full bg-card p-0.5 text-ink">
                    <Countdown
                      expiresAt={liveTicket?.expiresAt ?? detected.expiresAt}
                      totalMs={settings.depositExpiryMinutes * 60_000}
                      size={56}
                      label="Sisa waktu klaim QR"
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-card text-ink">
                    <Icon name="scan" size={22} />
                  </span>
                  <div>
                    <p className="font-display text-xl font-black leading-tight">Cukup Scan QR &amp; Klaim</p>
                    <p className="text-xs text-ink-soft">
                      Tidak perlu sambung tempat sampah dulu. Deteksi botol akan membuat QR 1x klaim berbatas waktu.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Kartu Hasil Terdeteksi atau Showcase Bin Interaktif */}
            <AnimatePresence mode="wait">
              {detected ? (
                <motion.div
                  key={detected.nonce}
                  initial={{ opacity: 0, y: 18, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 250, damping: 20 }}
                  className="patch relative grid justify-items-center gap-4 overflow-hidden border-2 border-ink p-6 text-center"
                >
                  {ticketClaimed && <Burst count={16} />}

                  <div className="relative z-10 flex flex-wrap items-center justify-center gap-2">
                    <Chip tone="denim">Hasil Deteksi Sensor</Chip>
                    <Chip tone="thread">{detected.tier}</Chip>
                  </div>

                  <div className="relative z-10">
                    <p className="font-display text-6xl font-black leading-none tabular-nums">
                      {detected.heightCm.toFixed(1)} cm
                    </p>
                    <div className="mt-2 flex justify-center">
                      <Points value={detected.points} size={26} className="text-3xl" />
                    </div>
                  </div>

                  {ticketClaimed ? (
                    <div className="relative z-10 grid w-full gap-2 rounded-[16px] border-2 border-fill bg-denim-soft p-5">
                      <p className="font-display text-3xl font-black leading-none text-ink">
                        Diklaim oleh {liveTicket?.userName ?? "Pengunjung"}
                      </p>
                      <p className="text-sm text-ink-soft">
                        QR ini sudah dipakai dan otomatis terkunci sehingga orang lain tidak dapat mengklaimnya lagi.
                      </p>
                    </div>
                  ) : ticketExpired ? (
                    <div className="relative z-10 grid w-full gap-2 rounded-[16px] border-2 border-danger bg-danger-soft p-5">
                      <p className="font-display text-3xl font-black leading-none text-danger">QR Sudah Hangus</p>
                      <p className="text-sm text-ink-soft">
                        Batas waktu klaim {settings.depositExpiryMinutes} menit telah berakhir. Tekan tombol di bawah
                        untuk mendeteksi botol berikutnya.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="relative z-10 rounded-[18px] border-2 border-ink bg-white p-4 shadow-[0_4px_0_var(--thread)]">
                        <QRCodeSVG
                          value={`${origin}/hubung?tiket=${detected.depositId}`}
                          size={220}
                          level="M"
                          title={`QR klaim 1x pakai ${detected.heightCm.toFixed(1)} cm`}
                        />
                      </div>

                      <p className="relative z-10 max-w-xs text-sm text-ink-soft">
                        Scan QR ini dari menu <strong>Scan QR</strong> lalu tekan <strong>Klaim Poin</strong> sebelum
                        waktu habis ({settings.depositExpiryMinutes} menit).
                      </p>
                    </>
                  )}

                  <div className="relative z-10 grid w-full gap-2">
                    <Button
                      variant={ticketClaimed || ticketExpired ? "thread" : "ghost"}
                      size={ticketClaimed || ticketExpired ? "md" : "sm"}
                      onClick={() => {
                        setDetected(null);
                        setDemoHeightCm(null);
                        consumeCurrentBottle(false);
                      }}
                      className="w-full"
                    >
                      Scan Botol Berikutnya
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="waiting-detect"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="patch patch-linen grid justify-items-center gap-4 p-6 text-center"
                >
                  <motion.div
                    animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <BinArt percent={percent} drop={drop} className="w-44" />
                  </motion.div>

                  <div className="w-full">
                    <Chip tone="denim">{formatNumber(bin.totalBottles)} botol terkumpul di unit ini</Chip>
                    <p className="mt-2 font-display text-3xl font-black leading-none">Menunggu Hasil Deteksi</p>
                    <p className="mt-1.5 text-sm text-ink-soft">
                      Taruh botol di alas sensor sebelah kiri lalu tekan <strong>Deteksi Ukuran Botol</strong> untuk
                      memunculkan QR klaim di layar ini.
                    </p>
                  </div>

                  <div className="w-full border-t-2 border-dashed border-stitch pt-3 text-left">
                    <div className="mb-1 flex items-center justify-between text-xs font-bold text-ink-soft">
                      <span>Kapasitas {bin.name}</span>
                      <span className="tabular-nums">
                        {bin.bottleCount} / {bin.capacityBottles} botol ({percent}%)
                      </span>
                    </div>
                    <FillGauge percent={percent} label={`Isi ${bin.name}`} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>
    </div>
  );
}
