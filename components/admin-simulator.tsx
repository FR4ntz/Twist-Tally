"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { createDeposit, liveSession, publishLiveSensor } from "@/lib/actions";
import { useArduinoSerial } from "@/lib/arduino-serial";
import { fillPercent } from "@/lib/format";
import { useCollection, useDoc, useNow, useOrigin } from "@/lib/hooks";
import { readBottle, sampleHeight, sortTiers, sumPoints, withDefaults } from "@/lib/points";
import type { Bin, PointsSettings } from "@/lib/types";
import { BinArt } from "./bin-art";
import { BottleScannerPad } from "./bottle-scanner-pad";
import { Countdown } from "./countdown";
import { Icon } from "./icons";
import { toast } from "./providers";
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  LinkButton,
  LoadingBlock,
  PageTitle,
  Points,
  SelectField,
  Switch,
} from "./ui";

export function AdminSimulator() {
  const bins = useCollection<Bin>({ path: "bins" });
  const settingsDoc = useDoc<PointsSettings>("settings/points");
  const settings = withDefaults(settingsDoc.data);
  const tiers = sortTiers(settings.tiers);
  const now = useNow(1000);
  const origin = useOrigin();

  const [binId, setBinId] = useState("");
  const [heights, setHeights] = useState<number[]>([]);
  const [drop, setDrop] = useState<{ id: number } | null>(null);
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ binId: string; userName: string; points: number; count: number } | null>(null);
  const [lastDetectedCm, setLastDetectedCm] = useState<number | null>(null);

  const [broadcastLive, setBroadcastLive] = useState(true);
  const [autoRespondUserDetect, setAutoRespondUserDetect] = useState(true);
  const [autoCaptureArduino, setAutoCaptureArduino] = useState(false);
  const [keepSession, setKeepSession] = useState(true);

  const serialStatus = useArduinoSerial((s) => s.status);
  const serialLog = useArduinoSerial((s) => s.log);
  const liveHeightCm = useArduinoSerial((s) => s.liveHeightCm);
  const liveDistanceCm = useArduinoSerial((s) => s.liveDistanceCm);
  const initSupport = useArduinoSerial((s) => s.initSupport);
  const connectSerial = useArduinoSerial((s) => s.connect);
  const disconnectSerial = useArduinoSerial((s) => s.disconnect);
  const consumeCurrentBottle = useArduinoSerial((s) => s.consumeCurrentBottle);
  const setAutoCaptureHandler = useArduinoSerial((s) => s.setAutoCaptureHandler);

  const lastBroadcastRef = useRef<{ at: number; height: number | null }>({ at: 0, height: null });
  const handledRequestIdRef = useRef<string | null>(null);

  const addBottle = useCallback((height: number) => {
    setHeights((list) => [...list, height]);
    setDrop((d) => ({ id: (d?.id ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    initSupport();
  }, [initSupport]);

  useEffect(() => {
    setAutoCaptureHandler(autoCaptureArduino ? addBottle : null);
    return () => setAutoCaptureHandler(null);
  }, [autoCaptureArduino, addBottle, setAutoCaptureHandler]);

  const bin = bins.data?.find((b) => b.id === binId) ?? bins.data?.[0] ?? null;
  const activeBinId = bin?.id ?? null;
  const session = bin ? liveSession(bin, now) : null;

  const pushLiveToBin = useCallback(
    (targetBinId: string, heightCm: number | null, distanceCm: number | null, source: "arduino" | "simulator") => {
      if (!broadcastLive) return;
      const nowMs = Date.now();
      const prev = lastBroadcastRef.current;
      const changedSignificantly =
        (heightCm === null) !== (prev.height === null) ||
        (heightCm !== null && prev.height !== null && Math.abs(heightCm - prev.height) >= 0.4);
      if (!changedSignificantly && nowMs - prev.at < 1200) return;
      if (nowMs - prev.at < 450 && prev.height !== null && heightCm !== null) return;

      lastBroadcastRef.current = { at: nowMs, height: heightCm };
      if (heightCm === null || heightCm < 5) {
        publishLiveSensor(targetBinId, null).catch(() => {});
        return;
      }
      const reading = readBottle(heightCm, tiers);
      publishLiveSensor(targetBinId, {
        heightCm,
        distanceCm,
        tier: reading.tier,
        points: reading.points,
        source,
      }).catch(() => {});
    },
    [broadcastLive, tiers],
  );

  useEffect(() => {
    if (!activeBinId || !broadcastLive || serialStatus !== "connected") return;
    pushLiveToBin(activeBinId, liveHeightCm, liveDistanceCm, "arduino");
  }, [activeBinId, broadcastLive, serialStatus, liveHeightCm, liveDistanceCm, pushLiveToBin]);

  useEffect(() => {
    const req = session?.detectRequest;
    if (!bin || !session || !req || !autoRespondUserDetect) return;
    if (handledRequestIdRef.current === req.id) return;
    handledRequestIdRef.current = req.id;

    const chosenHeight =
      liveHeightCm !== null && liveHeightCm >= 5
        ? liveHeightCm
        : req.heightCm !== null && req.heightCm >= 5
          ? req.heightCm
          : null;

    if (chosenHeight === null) {
      toast.error(`${session.userName} menekan Deteksi Ukuran, tetapi belum ada botol di atas alas.`);
      return;
    }

    const rounded = Math.round(chosenHeight * 10) / 10;
    createDeposit(bin, [rounded], settings, { keepSession })
      .then((result) => {
        setDrop((d) => ({ id: (d?.id ?? 0) + 1 }));
        setSent({ binId: bin.id, userName: result.userName, points: result.points, count: result.bottles.length });
        toast.ok(`Deteksi ukuran dari ${result.userName}: ${rounded.toFixed(1)} cm (+${result.points} poin dikirim).`);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Gagal mencatat deteksi dari pengguna.");
      });
  }, [bin, session, autoRespondUserDetect, liveHeightCm, settings, keepSession]);

  if (bins.loading || settingsDoc.loading) return <LoadingBlock label="Menyiapkan simulator..." />;
  if (bins.error) return <ErrorState title="Simulator belum bisa dibuka">Periksa koneksi internet, lalu muat ulang halaman.</ErrorState>;
  if (!bins.data || bins.data.length === 0 || !bin) {
    return (
      <div>
        <PageTitle title="Simulator sensor" />
        <EmptyState
          title="Belum ada tempat sampah"
          action={<LinkButton href="/admin/bin" variant="thread">Daftarkan tempat sampah</LinkButton>}
        >
          Simulator mengirim hasil bacaan sensor atas nama ID sebuah tempat sampah, jadi tempat sampahnya harus ada dulu.
        </EmptyState>
      </div>
    );
  }

  const bottles = heights.map((h) => readBottle(h, tiers));
  const total = sumPoints(bottles);
  const percent = fillPercent(bin.bottleCount + heights.length, bin.capacityBottles);

  function addCustom() {
    const value = Number(custom);
    if (!Number.isFinite(value) || value < 5 || value > 60) {
      setCustomError("Isi tinggi antara 5 dan 60 cm.");
      return;
    }
    setCustomError(null);
    addBottle(Math.round(value * 10) / 10);
    setCustom("");
  }

  async function handleDisconnect() {
    await disconnectSerial();
    if (activeBinId) publishLiveSensor(activeBinId, null).catch(() => {});
  }

  async function send() {
    if (!bin) return;
    setBusy(true);
    try {
      const result = await createDeposit(bin, heights, settings, { keepSession });
      setSent({ binId: bin.id, userName: result.userName, points: result.points, count: result.bottles.length });
      setHeights([]);
      setLastDetectedCm(null);
      consumeCurrentBottle();
      toast.ok(`Sensor mencatat ${result.points} poin untuk ${result.userName}. Menunggu klaim.`);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Hasil sensor gagal dikirim. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  function handleAdminDetect(detectedCm: number) {
    const result = readBottle(detectedCm, tiers);
    consumeCurrentBottle();
    setLastDetectedCm(detectedCm);
    addBottle(detectedCm);
    toast.ok(`Ukuran terdeteksi: ${detectedCm.toFixed(1)} cm (${result.tier}, +${result.points} poin).`);
  }

  return (
    <div className="grid gap-6">
      <PageTitle title="Simulator & Sensor Alas" className="mb-0">
        Hubungkan Arduino via USB, taruh botol di atas alas, lalu gunakan <strong>Deteksi Ukuran Botol</strong>. Pembacaan alas
        juga bisa disiarkan langsung ke layar tempat sampah dan ponsel pengunjung yang tersambung.
      </PageTitle>

      <section className="patch patch-linen grid gap-4 p-5" aria-labelledby="usb-sensor">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="usb-sensor" className="text-2xl">Sensor Arduino via USB</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Upload sketch <code className="font-mono">sensor-arduino/twist_and_tally_sensor.ino</code> (Trig pin 10, Echo pin 9, baud 9600), lalu pastikan Serial Monitor menampilkan <code className="font-mono">Ultrasonic Sensor Started</code>.
            </p>
          </div>
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
        </div>
        <p
          role="status"
          className={`rounded-[10px] border-2 px-3.5 py-2.5 text-sm font-bold ${
            serialStatus === "connected"
              ? "border-fill bg-denim-soft"
              : serialStatus === "error" || serialStatus === "unsupported"
                ? "border-danger bg-danger-soft"
                : "border-dashed border-edge"
          }`}
        >
          {serialLog}
        </p>
        {serialStatus === "unsupported" && (
          <p className="text-sm text-ink-soft">
            Buka aplikasi di Chrome atau Edge dan lewat <code className="font-mono">localhost</code> atau HTTPS.
          </p>
        )}

        <div className="grid gap-2 border-t-2 border-dashed border-stitch pt-3 sm:grid-cols-2">
          <Switch
            checked={broadcastLive}
            onChange={(val) => {
              setBroadcastLive(val);
              if (!val && activeBinId) publishLiveSensor(activeBinId, null).catch(() => {});
            }}
            label="Siarkan tinggi alas ke HP & layar bin"
          />
          <Switch
            checked={autoRespondUserDetect}
            onChange={setAutoRespondUserDetect}
            label="Auto-kirim saat user tekan Deteksi Ukuran"
          />
          <Switch
            checked={keepSession}
            onChange={setKeepSession}
            label="Pertahankan sesi pengguna setelah kirim"
          />
          <Switch
            checked={autoCaptureArduino}
            onChange={setAutoCaptureArduino}
            label="Auto-tambah botol saat sensor stabil"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <section className="patch grid content-start gap-5 p-5" aria-labelledby="sim-input">
          <h2 id="sim-input" className="text-2xl">
            Alas sensor &amp; sambungan pengguna
          </h2>
          <SelectField
            label="Tempat sampah (sampahId)"
            value={bin.id}
            onChange={(e) => {
              const nextId = e.target.value;
              if (activeBinId) publishLiveSensor(activeBinId, null).catch(() => {});
              setBinId(nextId);
              setHeights([]);
              setSent(null);
            }}
          >
            {bins.data.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.id}
              </option>
            ))}
          </SelectField>

          <div
            className={`flex items-center justify-between gap-3 rounded-[12px] border-2 p-3 ${
              session ? "border-fill bg-denim-soft" : "border-dashed border-edge"
            }`}
          >
            {session ? (
              <>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip tone="denim">Tersambung</Chip>
                    {session.detectRequest && <Chip tone="thread">User minta deteksi</Chip>}
                  </div>
                  <p className="mt-1 truncate font-bold">{session.userName}</p>
                  <p className="text-sm text-ink-soft">Poin dicatat ke akun ini lewat QR {bin.sampahId}.</p>
                </div>
                <Countdown expiresAt={session.expiresAt} totalMs={settings.sessionExpiryMinutes * 60_000} size={56} label="Sisa waktu sambungan" />
              </>
            ) : (
              <div>
                <p className="font-bold">Belum ada pengguna tersambung</p>
                <p className="text-sm text-ink-soft">
                  Di aplikasi warga, scan QR atau buka{" "}
                  <Link href={`/hubung?sampah=${bin.id}`} className="font-bold underline">
                    /hubung?sampah={bin.id}
                  </Link>
                  , lalu tekan Hubungkan.
                </p>
              </div>
            )}
          </div>

          <BottleScannerPad
            liveHeightCm={liveHeightCm}
            liveDistanceCm={liveDistanceCm}
            sensorOnline={serialStatus === "connected"}
            sourceLabel={serialStatus === "connected" ? "Arduino USB aktif" : "USB belum terhubung"}
            sampahId={bin.sampahId}
            tiers={tiers}
            buttonLabel="Deteksi Ukuran Botol & Tambah"
            onDetect={handleAdminDetect}
          />

          {lastDetectedCm !== null && (
            <div className="patch patch-linen grid justify-items-center gap-2 border-2 border-fill p-4 text-center">
              <Chip tone="denim">QR Hasil Deteksi ({bin.sampahId})</Chip>
              <div className="rounded-[10px] bg-white p-2.5 shadow-sm">
                <QRCodeSVG
                  value={`${origin}/hubung?sampah=${bin.sampahId}&tinggi=${lastDetectedCm}`}
                  size={140}
                  level="M"
                  title={`QR deteksi ${lastDetectedCm.toFixed(1)} cm`}
                />
              </div>
              <p className="text-xs font-bold text-ink-soft">
                {lastDetectedCm.toFixed(1)} cm · {readBottle(lastDetectedCm, tiers).tier} (+{readBottle(lastDetectedCm, tiers).points} poin)
              </p>
            </div>
          )}

          <details className="rounded-[12px] border-2 border-dashed border-stitch p-3">
            <summary className="text-sm font-bold">Tambah cepat atau input tinggi manual</summary>
            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-3 gap-2">
                {tiers.map((tier, i) => {
                  const h = sampleHeight(tiers, i);
                  return (
                    <Button
                      key={tier.label}
                      variant="ghost"
                      size="sm"
                      aria-label={`${tier.label}, ${h} cm`}
                      className="min-h-14 flex-col gap-0 px-2 py-1.5"
                      onClick={() => addBottle(h)}
                    >
                      <span className="flex items-center gap-1">
                        <Icon name="plus" size={14} />
                        {tier.label}
                      </span>
                      <span className="text-xs font-normal text-ink-soft">{h} cm</span>
                    </Button>
                  );
                })}
              </div>

              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Field
                    label="Tinggi sendiri (cm)"
                    type="number"
                    inputMode="decimal"
                    min={5}
                    max={60}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    error={customError}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustom();
                      }
                    }}
                  />
                </div>
                <Button variant="ghost" onClick={addCustom} className="mt-[1.65rem]">
                  Tambah
                </Button>
              </div>
            </div>
          </details>
        </section>

        <section className="patch patch-linen grid content-start gap-4 p-5" aria-labelledby="sim-result">
          <div className="flex items-start justify-between gap-3">
            <h2 id="sim-result" className="text-2xl">
              Hasil bacaan
            </h2>
            <BinArt percent={percent} drop={drop} className="-mt-1 w-28 shrink-0" />
          </div>
          {bottles.length === 0 ? (
            <p className="text-ink-soft">
              Belum ada botol di daftar. Taruh botol di alas lalu tekan <strong>Deteksi Ukuran Botol &amp; Tambah</strong>.
            </p>
          ) : (
            <ul className="divide-y-2 divide-dashed divide-stitch">
              <AnimatePresence initial={false}>
                {bottles.map((b, i) => (
                  <motion.li
                    key={`${i}-${b.heightCm}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <span>
                      Botol {i + 1}: {b.heightCm} cm, {b.tier.toLowerCase()}
                    </span>
                    <span className="flex items-center gap-2">
                      <Points value={b.points} size={16} />
                      <button
                        type="button"
                        aria-label={`Hapus botol ${i + 1}`}
                        onClick={() => setHeights((list) => list.filter((_, idx) => idx !== i))}
                        className="grid size-11 place-items-center rounded-full hover:bg-paper"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
          <div className="flex items-center justify-between border-t-2 border-stitch pt-3">
            <span className="font-bold">{bottles.length} botol</span>
            <Points value={total} size={24} className="text-3xl" />
          </div>
          <Button variant="thread" loading={busy} disabled={bottles.length === 0 || !session} onClick={send} className="min-h-14 text-lg">
            Kirim hasil sensor
          </Button>
          {!session && bottles.length > 0 && (
            <p className="text-sm text-ink-soft">Tombol aktif setelah ada pengguna yang tersambung ke {bin.id}.</p>
          )}
        </section>
      </div>

      {sent && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="patch patch-denim grid gap-3 p-5"
          aria-live="polite"
        >
          <h2 className="text-3xl">Poin tercatat, menunggu klaim</h2>
          <p>
            {sent.count} botol, {sent.points} poin atas nama {sent.userName} di {sent.binId}. Poin hangus bila tidak
            diklaim dalam {settings.depositExpiryMinutes} menit.
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/bin?id=${sent.binId}`} variant="thread" size="sm">
              Buka layar tempat sampah
            </LinkButton>
          </div>
        </motion.section>
      )}
    </div>
  );
}
