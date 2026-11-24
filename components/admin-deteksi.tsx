"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import type { Timestamp } from "firebase/firestore";
import {
  ActionError,
  createDeposit,
  disconnectFromBin,
  expireDeposit,
  liveSession,
  publishLiveSensor,
  syncSessionBasket,
} from "@/lib/actions";
import { useArduinoSerial } from "@/lib/arduino-serial";
import { useCelebration } from "@/lib/celebrate";
import { fillPercent, formatNumber } from "@/lib/format";
import { useCollection, useDoc, useNow, useOrigin } from "@/lib/hooks";
import { readBottle, sortTiers, sumPoints, tierForHeight, withDefaults } from "@/lib/points";
import type { Bin, BottleReading, Deposit, PointsSettings } from "@/lib/types";
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
  const [basket, setBasket] = useState<BottleReading[]>([]);
  const [sending, setSending] = useState(false);
  const [sentDeposit, setSentDeposit] = useState<{
    depositId: string;
    userName: string;
    points: number;
    bottleCount: number;
    expiresAt: Timestamp;
    nonce: number;
  } | null>(null);
  const [drop, setDrop] = useState<{ id: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const sentDoc = useDoc<Deposit>(sentDeposit ? `deposits/${sentDeposit.depositId}` : null);
  const celebratedRef = useRef<string | null>(null);
  const expiredRef = useRef<string | null>(null);
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
  const session = bin ? liveSession(bin, now) : null;

  const effectiveHeight = demoMode ? demoHeightCm : liveHeightCm;
  const effectiveDistance = demoMode
    ? demoHeightCm !== null
      ? Math.max(2, Math.round((35 - demoHeightCm) * 10) / 10)
      : null
    : liveDistanceCm;

  const liveDeposit = sentDoc.data;
  const claimSuccess = liveDeposit?.status === "claimed";
  const claimExpired =
    sentDeposit !== null &&
    (liveDeposit?.status === "expired" ||
      (!claimSuccess && (liveDeposit?.expiresAt ?? sentDeposit.expiresAt).toMillis() <= now));

  useEffect(() => {
    if (!sentDeposit || !liveDeposit) return;
    if (liveDeposit.status === "claimed" && celebratedRef.current !== sentDeposit.depositId) {
      celebratedRef.current = sentDeposit.depositId;
      useCelebration
        .getState()
        .fire(`+${liveDeposit.points}`, `diklaim oleh ${liveDeposit.userName ?? sentDeposit.userName}`);
    }
  }, [sentDeposit, liveDeposit]);

  useEffect(() => {
    if (!sentDeposit || !claimExpired || claimSuccess) return;
    if (expiredRef.current === sentDeposit.depositId) return;
    expiredRef.current = sentDeposit.depositId;
    expireDeposit(sentDeposit.depositId).catch(() => {});
  }, [sentDeposit, claimExpired, claimSuccess]);

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
          Daftarkan minimal satu tempat sampah dulu agar QR sambungan dan hasil deteksi botol bisa dipakai.
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

  const basketPoints = sumPoints(basket);
  const flowStep = sentDeposit ? 3 : session ? 2 : 1;

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

  async function handleDisconnectSerial() {
    await disconnectSerial();
    if (activeBinId) publishLiveSensor(activeBinId, null).catch(() => {});
  }

  async function handleDisconnectVisitor() {
    if (!bin) return;
    try {
      await disconnectFromBin(bin.id);
      setBasket([]);
      setSentDeposit(null);
      setDemoHeightCm(null);
      consumeCurrentBottle(false);
      toast.ok("Hubungan pengunjung diputus. QR terbuka kembali untuk pengunjung berikutnya.");
    } catch {
      toast.error("Gagal memutus hubungan. Coba lagi.");
    }
  }

  function addDetectedBottle() {
    if (!bin || activeHeight === null || activeHeight < 3 || scanning) return;
    setScanning(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(25);
    const captured = Math.round(activeHeight * 10) / 10;
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => {
      setScanning(false);
      const item = readBottle(captured, tiers);
      const nextBasket = [...basket, item];
      setBasket(nextBasket);
      setSentDeposit(null);
      setDrop((d) => ({ id: (d?.id ?? 0) + 1 }));
      if (!demoMode) consumeCurrentBottle(false);
      setDemoHeightCm(null);
      if (session) {
        syncSessionBasket(bin.id, nextBasket).catch(() => {});
      }
      toast.ok(`Botol #${nextBasket.length} ditambahkan: ${captured.toFixed(1)} cm (${item.tier}, +${item.points} poin).`);
    }, 520);
  }

  function removeBasketItem(index: number) {
    if (!bin) return;
    const nextBasket = basket.filter((_, i) => i !== index);
    setBasket(nextBasket);
    if (session) {
      syncSessionBasket(bin.id, nextBasket).catch(() => {});
    }
  }

  async function sendBasketToUser() {
    if (!bin || !session || basket.length === 0 || sending) return;
    setSending(true);
    try {
      const heights = basket.map((b) => b.heightCm);
      const result = await createDeposit(bin, heights, settings, { keepSession: true });
      setSentDeposit({
        depositId: result.depositId,
        userName: result.userName,
        points: result.points,
        bottleCount: result.bottles.length,
        expiresAt: result.expiresAt,
        nonce: Date.now(),
      });
      setBasket([]);
      setDrop((d) => ({ id: (d?.id ?? 0) + 1 }));
      toast.ok(`${result.points} poin dari ${result.bottles.length} botol dikirim ke ${result.userName} untuk diklaim!`);
    } catch (error) {
      toast.error(error instanceof ActionError ? error.message : "Gagal mengirim poin ke pengunjung.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <CelebrationOverlay />

      <div className="gingham h-3 w-full border-b-2 border-ink" aria-hidden="true" />

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
                setBasket([]);
                setSentDeposit(null);
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
              <Button variant="ghost" size="sm" onClick={handleDisconnectSerial}>
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
        {/* Hero Judul & Alur 3 Langkah: Scan QR -> Deteksi Beberapa Botol -> Klaim & Putus */}
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
                    animate={reduceMotion ? undefined : { scale: [1, 1.45, 1], opacity: [1, 0.45, 1] }}
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
                Scan QR untuk menghubungkan akunmu, setor 1 atau beberapa botol sekaligus di atas alas ukur, lalu klaim
                poin dan putuskan hubungan saat selesai.
              </p>
            </div>

            <ol className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
              {[
                {
                  step: 1,
                  title: "1. Scan QR Akun",
                  desc: "Pindai QR untuk mengunci sesi atas namamu.",
                  icon: "scan" as const,
                },
                {
                  step: 2,
                  title: "2. Deteksi (>1 Botol)",
                  desc: "Ukur satu per satu botol hingga selesai.",
                  icon: "bottle" as const,
                },
                {
                  step: 3,
                  title: "3. Klaim & Putus",
                  desc: "Klaim total poin lalu lepas koneksi stasiun.",
                  icon: "tag" as const,
                },
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
        <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Kiri: Ruang Ukur Ultrasonik */}
          <section className="patch grid gap-5 p-5 sm:p-7" aria-labelledby="alas-stage">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 id="alas-stage" className="text-3xl sm:text-4xl">
                  Alas Sensor Ultrasonik
                </h2>
                <p role="status" className="text-xs font-bold text-ink-soft">
                  {demoMode
                    ? "Mode demo aktif: atur tinggi botol simulasi di bawah lalu tambahkan ke daftar."
                    : serialLog}
                </p>
                {!demoMode && serialStatus === "connected" && lastRawLine && (
                  <p className="mt-1 truncate font-mono text-[11px] font-bold text-denim">Serial: {lastRawLine}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {effectiveDistance !== null && <Chip tone="denim">Pantul {effectiveDistance.toFixed(1)} cm</Chip>}
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

                  <div
                    className="mt-1.5 h-4 w-52 rounded-full border-2 border-ink bg-denim shadow-[0_4px_0_var(--ink)]"
                    aria-hidden="true"
                  >
                    <span className="block h-full w-full rounded-full border-b-2 border-dashed border-on-fill/55" />
                  </div>
                </div>

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

            <Button
              variant="thread"
              loading={scanning}
              disabled={activeHeight === null}
              onClick={addDetectedBottle}
              className="min-h-16 w-full text-xl shadow-[0_4px_0_var(--ink)]"
            >
              <Icon name="plus" size={22} />
              {scanning ? "Mengukur Botol..." : "Deteksi & Tambah Botol"}
            </Button>

            {demoMode && (
              <div className="grid gap-3 rounded-[14px] border-2 border-dashed border-denim bg-denim-soft/65 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-wider text-ink">Kontrol Simulasi Pameran</p>
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

            <div className="grid gap-2 border-t-2 border-dashed border-stitch pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Kategori Poin Botol</p>
              <ul className="grid grid-cols-3 gap-2.5">
                {tiers.map((tier, idx) => {
                  const activeMatch = liveTier?.label === tier.label;
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

          {/* Kanan: QR Hubungkan Akun -> Daftar Botol Terdeteksi -> Kirim Klaim -> Putuskan Hubungan */}
          <section className="grid gap-5" aria-live="polite" aria-labelledby="hasil-pameran">
            <h2 id="hasil-pameran" className="sr-only">
              Koneksi akun, daftar botol, dan klaim poin
            </h2>

            {/* Kartu 1: Status Akun Terhubung atau QR Koneksi */}
            {session ? (
              <div className="patch patch-denim grid gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Chip tone="thread">Akun Terhubung (Terkunci)</Chip>
                    <p className="mt-2 truncate font-display text-4xl font-black leading-none">{session.userName}</p>
                    <p className="mt-1 text-xs text-on-fill/85">
                      Hanya {session.userName} yang dapat menerima dan mengklaim poin selama sesi ini aktif.
                    </p>
                  </div>
                  <div className="rounded-full bg-card p-0.5 text-ink">
                    <Countdown
                      expiresAt={session.expiresAt}
                      totalMs={settings.sessionExpiryMinutes * 60_000}
                      size={58}
                      label="Sisa waktu sesi"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnectVisitor}
                  className="w-full border-on-fill/40 text-on-fill hover:bg-on-fill/15"
                >
                  Putuskan Hubungan ({session.userName})
                </Button>
              </div>
            ) : (
              <div className="patch grid justify-items-center gap-3 border-2 border-ink p-5 text-center">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Chip tone="thread">Langkah 1 · Hubungkan Akun</Chip>
                  <Chip tone="denim">{bin.sampahId}</Chip>
                </div>
                <h3 className="font-display text-3xl font-black leading-none">Scan QR untuk Mulai</h3>
                <div className="rounded-[16px] border-2 border-ink bg-white p-3.5 shadow-[0_4px_0_var(--thread)]">
                  <QRCodeSVG
                    value={`${origin}/hubung?sampah=${bin.sampahId}`}
                    size={190}
                    level="M"
                    title={`QR hubungkan ke stasiun ${bin.sampahId}`}
                  />
                </div>
                <p className="max-w-xs text-xs text-ink-soft">
                  Buka menu <strong>Scan QR</strong> di aplikasi Twist &amp; Tally lalu arahkan ke QR ini. Orang lain tidak
                  bisa masuk selama akunmu masih terhubung.
                </p>
              </div>
            )}

            {/* Kartu 2: Status Klaim Aktif, Keranjang Multi-Botol, atau Showcase Tempat Sampah */}
            <AnimatePresence mode="wait">
              {sentDeposit ? (
                <motion.div
                  key={sentDeposit.nonce}
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="patch relative grid gap-4 overflow-hidden border-2 border-ink p-6 text-center"
                >
                  {claimSuccess && <Burst count={16} />}

                  {claimSuccess ? (
                    <div className="relative z-10 grid justify-items-center gap-3">
                      <Chip tone="denim">Berhasil Diklaim</Chip>
                      <h3 className="font-display text-4xl font-black leading-none">
                        {liveDeposit?.userName ?? sentDeposit.userName} Dapat +{sentDeposit.points} Poin!
                      </h3>
                      <p className="text-sm text-ink-soft">
                        {sentDeposit.bottleCount} botol telah tercatat permanen. Putuskan hubungan jika pengunjung sudah
                        selesai, atau deteksi botol tambahan lagi.
                      </p>
                      <div className="grid w-full gap-2 pt-2">
                        {session && (
                          <Button variant="thread" onClick={handleDisconnectVisitor} className="min-h-12 w-full">
                            Putuskan Hubungan (Selesai)
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSentDeposit(null)}
                          className="w-full"
                        >
                          {session ? `Tambah Botol Lagi untuk ${session.userName}` : "Siap untuk Pengunjung Berikutnya"}
                        </Button>
                      </div>
                    </div>
                  ) : claimExpired ? (
                    <div className="relative z-10 grid justify-items-center gap-3">
                      <Chip tone="danger">Waktu Klaim Habis</Chip>
                      <h3 className="font-display text-3xl font-black leading-none text-danger">Poin Hangus</h3>
                      <p className="text-sm text-ink-soft">
                        Pengunjung belum menekan klaim dalam {settings.depositExpiryMinutes} menit.
                      </p>
                      <Button variant="ghost" size="sm" onClick={() => setSentDeposit(null)} className="w-full">
                        Tutup &amp; Lanjutkan
                      </Button>
                    </div>
                  ) : (
                    <div className="relative z-10 grid justify-items-center gap-3">
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="text-left">
                          <Chip tone="thread">Menunggu Klaim</Chip>
                          <p className="mt-1.5 font-display text-3xl font-black leading-none">
                            {sentDeposit.userName}
                          </p>
                        </div>
                        <Countdown
                          expiresAt={liveDeposit?.expiresAt ?? sentDeposit.expiresAt}
                          totalMs={settings.depositExpiryMinutes * 60_000}
                          size={58}
                          label="Batas waktu klaim"
                        />
                      </div>
                      <div className="w-full rounded-[14px] border-2 border-dashed border-stitch bg-paper-deep/70 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                          {sentDeposit.bottleCount} botol terkirim ke ponsel {sentDeposit.userName}
                        </p>
                        <div className="mt-1 flex justify-center">
                          <Points value={sentDeposit.points} size={26} className="text-3xl" />
                        </div>
                      </div>
                      <p className="text-xs text-ink-soft">
                        Minta <strong>{sentDeposit.userName}</strong> menekan tombol <strong>Klaim</strong> di layar ponselnya.
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : basket.length > 0 ? (
                <motion.div
                  key="basket-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="patch grid gap-4 border-2 border-ink p-5 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Chip tone="denim">Keranjang Setoran ({basket.length} botol)</Chip>
                      <h3 className="mt-1.5 font-display text-3xl font-black leading-none">Daftar Botol Terdeteksi</h3>
                    </div>
                    <Points value={basketPoints} size={22} className="text-2xl" />
                  </div>

                  <ul className="grid max-h-60 gap-2 overflow-y-auto pr-1">
                    {basket.map((item, idx) => (
                      <li
                        key={`${item.heightCm}-${idx}`}
                        className="flex items-center justify-between gap-3 rounded-[10px] border-2 border-dashed border-stitch bg-paper-deep/55 px-3 py-2 text-sm"
                      >
                        <span>
                          <strong>Botol #{idx + 1}</strong> · {item.heightCm.toFixed(1)} cm ({item.tier})
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-black text-denim">+{item.points}p</span>
                          <button
                            type="button"
                            aria-label={`Hapus botol ${idx + 1}`}
                            onClick={() => removeBasketItem(idx)}
                            className="grid size-7 place-items-center rounded-[6px] text-ink-soft hover:bg-danger-soft hover:text-danger"
                          >
                            <Icon name="close" size={14} />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>

                  {session ? (
                    <Button
                      variant="thread"
                      loading={sending}
                      onClick={sendBasketToUser}
                      className="min-h-14 w-full text-base shadow-[0_3px_0_var(--ink)]"
                    >
                      Kirim Klaim (+{basketPoints} Poin) ke {session.userName}
                    </Button>
                  ) : (
                    <p className="rounded-[10px] border-2 border-dashed border-thread bg-paper-deep px-3 py-2.5 text-center text-xs font-bold text-ink">
                      Scan QR di atas dulu agar akun pengunjung terhubung untuk mengklaim {basket.length} botol ini.
                    </p>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBasket([]);
                      if (session) syncSessionBasket(bin.id, []).catch(() => {});
                    }}
                    className="w-full"
                  >
                    Kosongkan Daftar Botol
                  </Button>
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
                    <BinArt percent={percent} drop={drop} className="w-40" />
                  </motion.div>

                  <div className="w-full">
                    <Chip tone="denim">{formatNumber(bin.totalBottles)} botol terkumpul di unit ini</Chip>
                    <p className="mt-2 font-display text-3xl font-black leading-none">
                      {session ? `Siap Deteksi Botol ${session.userName}` : "Menunggu Pengunjung Scan QR"}
                    </p>
                    <p className="mt-1.5 text-sm text-ink-soft">
                      {session
                        ? "Taruh botol di atas alas lalu tekan Deteksi & Tambah Botol. Kamu bisa menambahkan lebih dari 1 botol sebelum mengirim poin."
                        : "Setelah akun terhubung lewat QR di atas, setiap botol yang dideteksi akan masuk ke daftar setor pengguna."}
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
