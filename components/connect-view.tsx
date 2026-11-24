"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ActionError,
  claimDeposit,
  connectToBin,
  disconnectFromBin,
  expireDeposit,
  liveSession,
  requestSizeDetection,
} from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { useCelebration } from "@/lib/celebrate";
import { extractSampahId, extractTicketId, fillPercent } from "@/lib/format";
import { useDoc, useNow } from "@/lib/hooks";
import { readBottle, sortTiers, withDefaults } from "@/lib/points";
import type { Bin, Deposit, PointsSettings } from "@/lib/types";
import { BinArt } from "./bin-art";
import { Burst } from "./burst";
import { ClaimCard, totalMs, useMyDeposits } from "./claims";
import { Countdown } from "./countdown";
import { Icon } from "./icons";
import { toast } from "./providers";
import { Button, Chip, ErrorState, FillGauge, LinkButton, LoadingBlock, PageTitle, Points } from "./ui";

const LIVE_SENSOR_TTL_MS = 15_000;

export function ConnectView() {
  const searchParams = useSearchParams();
  const ticketId = extractTicketId(searchParams.get("tiket") ?? "");
  if (ticketId) return <TicketClaimView ticketId={ticketId} />;

  const sampahId = extractSampahId(searchParams.get("sampah") ?? "");
  const initialTinggiRaw = Number(searchParams.get("tinggi") ?? "");
  const initialTinggi =
    Number.isFinite(initialTinggiRaw) && initialTinggiRaw >= 3 && initialTinggiRaw <= 60
      ? Math.round(initialTinggiRaw * 10) / 10
      : null;

  return <BinConnectView sampahId={sampahId} initialTinggi={initialTinggi} />;
}

/** Alur sederhana: user scan QR tiket sekali pakai -> lihat hasil ukur & hitung mundur -> klaim 1 klik. */
function TicketClaimView({ ticketId }: { ticketId: string }) {
  const { user, profile } = useAuth();
  const depositDoc = useDoc<Deposit>(`deposits/${ticketId}`);
  const now = useNow(500);
  const [busy, setBusy] = useState(false);
  const expiredSentRef = useRef(false);

  const deposit = depositDoc.data;
  const isExpired =
    deposit !== null &&
    deposit !== undefined &&
    (deposit.status === "expired" || (deposit.status === "pending" && deposit.expiresAt.toMillis() <= now));

  useEffect(() => {
    if (!deposit || deposit.status !== "pending" || deposit.expiresAt.toMillis() > now) return;
    if (expiredSentRef.current) return;
    expiredSentRef.current = true;
    expireDeposit(ticketId).catch(() => {});
  }, [deposit, now, ticketId]);

  if (depositDoc.loading) return <LoadingBlock label="Memeriksa tiket QR klaim..." />;
  if (depositDoc.error) {
    return (
      <div className="mx-auto grid max-w-md gap-4">
        <ErrorState title="Tiket QR belum bisa dibuka">
          Periksa koneksi internetmu, lalu coba scan ulang QR-nya.
        </ErrorState>
        <LinkButton href="/scan" variant="ghost">
          Scan ulang
        </LinkButton>
      </div>
    );
  }
  if (!deposit) {
    return (
      <div className="mx-auto grid max-w-md gap-4">
        <ErrorState title="Tiket QR tidak ditemukan">
          Kode QR ini tidak terdaftar atau sudah dihapus. Pastikan kamu memindai QR terbaru dari layar deteksi botol.
        </ErrorState>
        <LinkButton href="/scan" variant="thread">
          Kembali ke Scan QR
        </LinkButton>
      </div>
    );
  }

  const claimedByMe = deposit.status === "claimed" && deposit.userId === user?.uid;
  const claimedByOther = deposit.status === "claimed" && deposit.userId !== user?.uid;

  async function handleClaim() {
    if (!user) return;
    setBusy(true);
    try {
      const result = await claimDeposit(user.uid, ticketId, profile?.name);
      useCelebration.getState().fire(`+${result.points}`, `poin masuk dari ${deposit?.binName ?? "Twist & Tally"}`);
    } catch (error) {
      toast.error(error instanceof ActionError ? error.message : "Klaim gagal. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  const groups = Object.values(
    deposit.bottles.reduce<Record<string, { tier: string; heightCm: number; count: number; points: number }>>(
      (acc, b) => {
        const key = `${b.tier}-${b.heightCm}`;
        const row = acc[key] ?? { tier: b.tier, heightCm: b.heightCm, count: 0, points: 0 };
        row.count += 1;
        row.points += b.points;
        acc[key] = row;
        return acc;
      },
      {},
    ),
  );

  return (
    <div className="mx-auto grid max-w-md gap-5">
      <PageTitle title="Klaim Poin Botol" className="mb-0">
        {deposit.binName} · Tiket sekali pakai
      </PageTitle>

      {claimedByMe ? (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="patch patch-denim relative grid gap-4 overflow-hidden p-6 text-center"
        >
          <Burst count={14} />
          <div className="relative z-10 grid justify-items-center gap-2">
            <Chip tone="thread">Berhasil Diklaim</Chip>
            <h2 className="text-4xl leading-none">Poin Masuk ke Akunmu</h2>
            <p className="text-on-fill/90">
              Kamu sudah mengklaim <strong>+{deposit.points} poin</strong> dari tiket QR ini. Tiket sekarang terkunci
              dan tidak dapat diklaim pengguna lain.
            </p>
            <div className="mt-2 grid w-full gap-2">
              <LinkButton href="/dashboard" variant="thread" className="w-full">
                Lihat Saldo di Dashboard
              </LinkButton>
              <LinkButton href="/scan" variant="ghost" className="w-full border-on-fill/40 text-on-fill hover:bg-on-fill/15">
                Scan QR Lainnya
              </LinkButton>
            </div>
          </div>
        </motion.div>
      ) : claimedByOther ? (
        <div className="grid gap-4">
          <ErrorState title="QR Ini Sudah Diklaim Orang Lain">
            Satu QR hasil deteksi botol hanya berlaku untuk satu orang penemu pertama. Silakan deteksi botol baru di alas
            sensor lalu scan QR baru yang muncul.
          </ErrorState>
          <div className="grid gap-2">
            <LinkButton href="/scan" variant="thread" className="w-full">
              Scan QR Baru
            </LinkButton>
            <LinkButton href="/dashboard" variant="ghost" className="w-full">
              Kembali ke Dashboard
            </LinkButton>
          </div>
        </div>
      ) : isExpired ? (
        <div className="grid gap-4">
          <ErrorState title="QR Sudah Hangus">
            Batas waktu klaim telah habis sebelum poin diklaim. Deteksi ulang botol di alas sensor untuk membuat QR baru.
          </ErrorState>
          <LinkButton href="/scan" variant="thread" className="w-full">
            Scan QR Lainnya
          </LinkButton>
        </div>
      ) : (
        <motion.article
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="receipt grid gap-4 px-6 pb-9 pt-5"
          aria-label={`Tiket ${deposit.points} poin dari ${deposit.binName}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Chip tone="denim">QR Siap Diklaim (1x Pakai)</Chip>
              <p className="mt-2 font-display text-3xl font-black leading-tight">{deposit.binName}</p>
            </div>
            <Countdown expiresAt={deposit.expiresAt} totalMs={totalMs(deposit)} size={62} label="Batas klaim QR" />
          </div>

          <ul className="grid gap-1.5 border-y-2 border-dashed border-stitch py-3">
            {groups.map((g) => (
              <li key={`${g.tier}-${g.heightCm}`} className="flex items-baseline justify-between gap-3">
                <span>
                  {g.count} botol {g.tier} ({g.heightCm.toFixed(1)} cm)
                </span>
                <span className="font-bold">+{g.points} poin</span>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <span className="font-bold">Total hadiah</span>
            <Points value={deposit.points} size={24} className="text-3xl" />
          </div>

          <Button variant="thread" loading={busy} onClick={handleClaim} className="min-h-14 w-full text-lg">
            Klaim +{deposit.points} Poin Sekarang
          </Button>
          <p className="text-center text-xs text-ink-soft">
            Klaim sebelum hitung mundur habis. Begitu diklaim, orang lain tidak dapat menggunakan QR ini lagi.
          </p>
        </motion.article>
      )}
    </div>
  );
}

function BinConnectView({ sampahId, initialTinggi }: { sampahId: string | null; initialTinggi: number | null }) {
  const { profile, user } = useAuth();
  const bin = useDoc<Bin>(sampahId ? `bins/${sampahId}` : null);
  const settingsDoc = useDoc<PointsSettings>("settings/points");
  const deposits = useMyDeposits(user?.uid ?? null);
  const now = useNow(500);
  const [busy, setBusy] = useState(false);

  if (!sampahId) {
    return (
      <div className="grid gap-4">
        <ErrorState title="QR tidak valid">
          Arahkan kamera ke QR hasil deteksi ukuran botol untuk mengklaim poinmu.
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
          Tidak ada tempat sampah dengan ID {sampahId}. Periksa QR lalu scan ulang.
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

            {liveSensorFresh && liveSensorFresh.heightCm >= 3 && (
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
    </div>
  );
}
