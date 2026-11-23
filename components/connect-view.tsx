"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ActionError,
  connectToBin,
  disconnectFromBin,
  liveSession,
  requestSizeDetection,
} from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { extractSampahId, fillPercent } from "@/lib/format";
import { useDoc, useNow } from "@/lib/hooks";
import { readBottle, sortTiers, withDefaults } from "@/lib/points";
import type { Bin, PointsSettings } from "@/lib/types";
import { BinArt } from "./bin-art";
import { ClaimCard, useMyDeposits } from "./claims";
import { Countdown } from "./countdown";
import { Icon } from "./icons";
import { toast } from "./providers";
import { Button, Chip, ErrorState, FillGauge, LinkButton, LoadingBlock, PageTitle, Points } from "./ui";

const LIVE_SENSOR_TTL_MS = 15_000;

export function ConnectView() {
  const searchParams = useSearchParams();
  const sampahId = extractSampahId(searchParams.get("sampah") ?? "");
  const initialTinggiRaw = Number(searchParams.get("tinggi") ?? "");
  const initialTinggi =
    Number.isFinite(initialTinggiRaw) && initialTinggiRaw >= 5 && initialTinggiRaw <= 60
      ? Math.round(initialTinggiRaw * 10) / 10
      : null;

  const { profile, user } = useAuth();
  const bin = useDoc<Bin>(sampahId ? `bins/${sampahId}` : null);
  const settingsDoc = useDoc<PointsSettings>("settings/points");
  const deposits = useMyDeposits(user?.uid ?? null);
  const now = useNow(500);
  const [busy, setBusy] = useState(false);

  if (!sampahId) {
    return (
      <div className="grid gap-4">
        <ErrorState title="ID tempat sampah tidak valid">
          ID terdiri dari SB- diikuti 4 huruf atau angka, contoh SB-7K3P. Scan ulang QR di tempat sampah.
        </ErrorState>
        <LinkButton href="/scan" variant="ghost">
          Kembali ke scan
        </LinkButton>
      </div>
    );
  }
  if (bin.loading || settingsDoc.loading) return <LoadingBlock label={`Mencari tempat sampah ${sampahId}...`} />;
  if (bin.error) {
    return <ErrorState title="Tempat sampah belum bisa dibuka">Periksa koneksi internetmu, lalu buka ulang halaman ini.</ErrorState>;
  }
  if (!bin.data) {
    return (
      <div className="grid gap-4">
        <ErrorState title="Tempat sampah tidak ditemukan">
          Tidak ada tempat sampah dengan ID {sampahId}. Periksa ID yang tercetak di bawah QR.
        </ErrorState>
        <LinkButton href="/scan" variant="ghost">
          Scan ulang
        </LinkButton>
      </div>
    );
  }

  const data = bin.data;
  const settings = withDefaults(settingsDoc.data);
  const tiers = sortTiers(settings.tiers);
  const session = liveSession(data, now);
  const mine = session?.userId === user?.uid;
  const taken = session !== null && !mine;
  const percent = fillPercent(data.bottleCount, data.capacityBottles);

  const liveSensorFresh =
    data.liveSensor && data.liveSensor.updatedAt && now - data.liveSensor.updatedAt.toMillis() <= LIVE_SENSOR_TTL_MS
      ? data.liveSensor
      : null;

  const scannedReading = initialTinggi !== null ? readBottle(initialTinggi, tiers) : null;

  const myPending = (deposits.data ?? [])
    .filter((d) => d.binId === data.sampahId && d.status === "pending" && d.expiresAt.toMillis() > now)
    .sort((a, b) => a.expiresAt.toMillis() - b.expiresAt.toMillis());

  async function connect() {
    if (!profile) return;
    setBusy(true);
    try {
      await connectToBin(data.sampahId, profile, settings.sessionExpiryMinutes);
      if (initialTinggi !== null) {
        await requestSizeDetection(data.sampahId, profile, settings.sessionExpiryMinutes, initialTinggi);
        const reading = readBottle(initialTinggi, tiers);
        toast.ok(`Tersambung ke ${data.name} dengan tinggi ${initialTinggi.toFixed(1)} cm (${reading.tier}).`);
      } else {
        toast.ok(`Akunmu tersambung ke ${data.name}. Taruh botol di alas!`);
      }
    } catch (error) {
      toast.error(error instanceof ActionError ? error.message : "Gagal menyambung. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await disconnectFromBin(data.sampahId);
      toast.ok("Sambungan diputus.");
    } catch {
      toast.error("Sambungan belum terputus. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageTitle title={data.name} className="mb-0">
        {data.location}
      </PageTitle>

      <div className="grid items-center gap-5 sm:grid-cols-[11rem_1fr]">
        <BinArt percent={percent} className="mx-auto w-44" />
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip>ID {data.sampahId}</Chip>
            {mine && <Chip tone="denim">Tersambung ke akunmu</Chip>}
            {taken && <Chip tone="thread">Sedang dipakai</Chip>}
            {!session && <Chip tone="plain">Siap dipakai</Chip>}
          </div>
          <FillGauge percent={percent} label={`Isi ${data.name}`} />
          <p className="text-sm text-ink-soft">
            {data.bottleCount} dari {data.capacityBottles} botol terisi.
          </p>
        </div>
      </div>

      {scannedReading && initialTinggi !== null && (
        <div className="patch patch-linen flex flex-wrap items-center justify-between gap-3 border-2 border-fill p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-denim">Hasil deteksi dari QR</p>
            <p className="font-display text-2xl font-black leading-tight">
              {initialTinggi.toFixed(1)} cm · {scannedReading.tier}
            </p>
          </div>
          <Points value={scannedReading.points} size={20} className="text-xl" />
        </div>
      )}

      <AnimatePresence mode="wait">
        {mine && session ? (
          <motion.section
            key="mine"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            aria-labelledby="sesi"
            className="grid gap-4"
          >
            <div className="patch patch-denim grid gap-3 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[12rem] flex-1">
                  <h2 id="sesi" className="text-3xl sm:text-4xl">
                    Tersambung ke {data.sampahId}
                  </h2>
                  <p className="mt-1.5 text-on-fill/90">
                    Taruh botol di atas alas tempat sampah. Sensor membaca tinggi botol atas nama {session.userName}, lalu
                    poinnya muncul di sini untuk kamu klaim.
                  </p>
                </div>
                <div className="rounded-full bg-card p-0.5 text-ink">
                  <Countdown
                    expiresAt={session.expiresAt}
                    totalMs={settings.sessionExpiryMinutes * 60_000}
                    size={60}
                    label="Sisa waktu sambungan"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-on-fill/85">
                <span>Batas klaim poin: {settings.depositExpiryMinutes} menit setelah sensor mencatat.</span>
                <Button variant="ghost" loading={busy} onClick={disconnect} size="sm" className="border-on-fill/40 text-on-fill hover:bg-on-fill/15">
                  Putuskan sambungan
                </Button>
              </div>
            </div>

            {liveSensorFresh && liveSensorFresh.heightCm >= 5 && (
              <div className="patch patch-linen flex flex-wrap items-center justify-between gap-3 border-2 border-thread p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Sensor alas mendeteksi botol</p>
                  <p className="font-display text-2xl font-black leading-tight">
                    {liveSensorFresh.heightCm.toFixed(1)} cm · {liveSensorFresh.tier}
                  </p>
                </div>
                <Points value={liveSensorFresh.points} size={20} className="text-xl" />
              </div>
            )}
          </motion.section>
        ) : taken && session ? (
          <motion.section
            key="taken"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="patch patch-linen p-6"
          >
            <h2 className="text-3xl">Sedang dipakai {session.userName}</h2>
            <p className="mt-2 text-ink-soft">
              Satu tempat sampah hanya melayani satu akun dalam satu waktu. Coba lagi dalam beberapa menit, atau pakai
              tempat sampah lain.
            </p>
          </motion.section>
        ) : (
          <motion.section
            key="free"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="patch p-6"
          >
            <h2 className="text-3xl">Hubungkan akunmu ke sensor</h2>
            <ol className="mt-3 grid gap-2 text-ink-soft">
              <li className="flex gap-3">
                <Icon name="check" size={18} />
                <span>Sensor mencatat botol atas nama {profile?.name ?? "akunmu"} dan ID {data.sampahId}.</span>
              </li>
              <li className="flex gap-3">
                <Icon name="check" size={18} />
                <span>Sambungan berlaku {settings.sessionExpiryMinutes} menit atau sampai poin tercatat.</span>
              </li>
              <li className="flex gap-3">
                <Icon name="check" size={18} />
                <span>Poin dari sensor harus diklaim dalam {settings.depositExpiryMinutes} menit, kalau tidak hangus.</span>
              </li>
            </ol>
            <Button variant="thread" loading={busy} onClick={connect} className="mt-5 min-h-14 w-full text-lg">
              {initialTinggi !== null
                ? `Hubungkan ke ${data.name} & Klaim ${initialTinggi.toFixed(1)} cm`
                : `Hubungkan ke ${data.name}`}
            </Button>
          </motion.section>
        )}
      </AnimatePresence>

      {myPending.length > 0 && (
        <section aria-labelledby="menunggu" className="grid gap-3">
          <h2 id="menunggu" className="text-3xl">
            Poin menunggu klaim
          </h2>
          {myPending.map((d) => (
            <ClaimCard key={d.id} deposit={d} />
          ))}
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">
          Kembali ke dashboard
        </Link>
        <Link href="/tukar" className="inline-flex min-h-11 items-center font-bold text-denim underline underline-offset-4">
          Tukar poin ke hadiah
        </Link>
      </div>
    </div>
  );
}
