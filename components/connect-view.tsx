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
} from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { useCelebration } from "@/lib/celebrate";
import { extractSampahId, extractTicketId, fillPercent } from "@/lib/format";
import { useDoc, useNow } from "@/lib/hooks";
import { sortTiers, sumPoints, withDefaults } from "@/lib/points";
import type { Bin, Deposit, PointsSettings } from "@/lib/types";
import { BinArt } from "./bin-art";
import { Burst } from "./burst";
import { ClaimCard, totalMs, useMyDeposits } from "./claims";
import { Countdown } from "./countdown";
import { toast } from "./providers";
import { Button, Chip, ErrorState, FillGauge, LinkButton, LoadingBlock, PageTitle, Points } from "./ui";

const LIVE_SENSOR_TTL_MS = 15_000;

export function ConnectView() {
  const searchParams = useSearchParams();
  const ticketId = extractTicketId(searchParams.get("tiket") ?? "");
  if (ticketId) return <TicketClaimView ticketId={ticketId} />;

  const sampahId = extractSampahId(searchParams.get("sampah") ?? "");
  return <BinConnectView sampahId={sampahId} />;
}

/** Alur utama: scan QR stasiun -> otomatis terhubung -> pantau deteksi multi-botol -> klaim -> putuskan hubungan. */
function BinConnectView({ sampahId }: { sampahId: string | null }) {
  const { profile, user } = useAuth();
  const bin = useDoc<Bin>(sampahId ? `bins/${sampahId}` : null);
  const settingsDoc = useDoc<PointsSettings>("settings/points");
  const deposits = useMyDeposits(user?.uid ?? null);
  const now = useNow(500);

  const [busy, setBusy] = useState(false);
  const [disconnectedByUser, setDisconnectedByUser] = useState(false);
  const autoTriedRef = useRef<string | null>(null);

  const data = bin.data;
  const settings = withDefaults(settingsDoc.data);
  const tiers = sortTiers(settings.tiers);
  const session = data ? liveSession(data, now) : null;
  const mine = Boolean(session && session.userId === user?.uid);
  const taken = Boolean(session && session.userId !== user?.uid);

  // Otomatis hubungkan akun begitu halaman dibuka dari Scan QR (bila stasiun bebas).
  useEffect(() => {
    if (!sampahId || !data || !profile || !user) return;
    if (disconnectedByUser || mine || taken || session !== null) return;
    if (autoTriedRef.current === sampahId) return;
    autoTriedRef.current = sampahId;

    connectToBin(data.sampahId, profile, settings.sessionExpiryMinutes)
      .then(() => {
        toast.ok(`Akun ${profile.name} terhubung ke ${data.name}.`);
      })
      .catch((error) => {
        toast.error(error instanceof ActionError ? error.message : "Gagal menghubungkan akun.");
      });
  }, [sampahId, data, profile, user, disconnectedByUser, mine, taken, session, settings.sessionExpiryMinutes]);

  if (!sampahId) {
    return (
      <div className="mx-auto grid max-w-md gap-4">
        <ErrorState title="QR tidak dikenali">
          Arahkan kamera ke QR yang tampil di layar Deteksi Botol Twist &amp; Tally.
        </ErrorState>
        <LinkButton href="/scan" variant="thread">
          Kembali ke Scan QR
        </LinkButton>
      </div>
    );
  }
  if (bin.loading || settingsDoc.loading) return <LoadingBlock label={`Menghubungkan ke ${sampahId}...`} />;
  if (bin.error) {
    return (
      <ErrorState title="Stasiun belum bisa dibuka">
        Periksa koneksi internetmu, lalu scan ulang QR-nya.
      </ErrorState>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto grid max-w-md gap-4">
        <ErrorState title="Stasiun tidak ditemukan">
          Tidak ada tempat sampah dengan ID {sampahId}.
        </ErrorState>
        <LinkButton href="/scan" variant="thread">
          Scan ulang
        </LinkButton>
      </div>
    );
  }

  const percent = fillPercent(data.bottleCount, data.capacityBottles);
  const basket = session?.basket ?? [];
  const basketPoints = sumPoints(basket);

  const liveSensorFresh =
    data.liveSensor && data.liveSensor.updatedAt && now - data.liveSensor.updatedAt.toMillis() <= LIVE_SENSOR_TTL_MS
      ? data.liveSensor
      : null;

  const myPending = (deposits.data ?? [])
    .filter((d) => d.binId === data.sampahId && d.status === "pending" && d.expiresAt.toMillis() > now)
    .sort((a, b) => a.expiresAt.toMillis() - b.expiresAt.toMillis());

  async function manualConnect() {
    if (!profile || !data) return;
    setBusy(true);
    try {
      setDisconnectedByUser(false);
      await connectToBin(data.sampahId, profile, settings.sessionExpiryMinutes);
      toast.ok(`Akunmu terhubung ke ${data.name}.`);
    } catch (error) {
      toast.error(error instanceof ActionError ? error.message : "Gagal menyambung. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(silent = false) {
    if (!data) return;
    setBusy(true);
    try {
      setDisconnectedByUser(true);
      await disconnectFromBin(data.sampahId);
      if (!silent) toast.ok("Hubungan dengan stasiun diputus.");
    } catch {
      toast.error("Hubungan belum terputus. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageTitle title={data.name} className="mb-0">
        {data.location} · {tiers.map((t) => `${t.label} ${t.points}p`).join(" / ")}
      </PageTitle>

      <div className="grid items-center gap-5 sm:grid-cols-[10rem_1fr]">
        <BinArt percent={percent} className="mx-auto w-40" />
        <div className="grid gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Chip>ID {data.sampahId}</Chip>
            {mine && <Chip tone="denim">Akunmu Terhubung</Chip>}
            {taken && <Chip tone="danger">Dipakai Orang Lain</Chip>}
            {!session && <Chip tone="plain">Stasiun Bebas</Chip>}
          </div>
          <FillGauge percent={percent} label={`Isi ${data.name}`} />
          <p className="text-sm text-ink-soft">
            {data.bottleCount} dari {data.capacityBottles} botol terisi.
          </p>
        </div>
      </div>

      {/* Kartu Setoran Menunggu Klaim (muncul begitu botol dikirim dari stasiun) */}
      {myPending.length > 0 && (
        <section aria-labelledby="menunggu" className="grid gap-3">
          <h2 id="menunggu" className="text-3xl">
            Poin Siap Diklaim
          </h2>
          {myPending.map((d) => (
            <ClaimCard key={d.id} deposit={d} onDisconnect={() => disconnect(true)} />
          ))}
        </section>
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
                  <Chip tone="thread">Terhubung ke Stasiun</Chip>
                  <h2 id="sesi" className="mt-2 text-3xl sm:text-4xl">
                    Halo, {session.userName}
                  </h2>
                  <p className="mt-1.5 text-sm text-on-fill/90">
                    Taruh botol satu per satu di alas sensor. Semua botol yang dideteksi akan dikumpulkan ke akunmu,
                    lalu tekan <strong>Klaim</strong> saat selesai.
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

              {/* Daftar botol yang sudah dideteksi di sesi ini */}
              {basket.length > 0 && (
                <div className="grid gap-2 rounded-[14px] bg-card p-4 text-ink">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-wider text-ink-soft">
                      Botol terdeteksi ({basket.length})
                    </p>
                    <Points value={basketPoints} size={18} className="text-lg" />
                  </div>
                  <ul className="divide-y divide-dashed divide-stitch text-sm">
                    {basket.map((b, i) => (
                      <li key={`${b.heightCm}-${i}`} className="flex items-center justify-between py-1.5">
                        <span>
                          Botol #{i + 1}: <strong>{b.heightCm.toFixed(1)} cm</strong> ({b.tier})
                        </span>
                        <span className="font-bold text-denim">+{b.points} poin</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-on-fill/85">
                <span>Batas waktu klaim setelah dikirim: {settings.depositExpiryMinutes} menit.</span>
                <Button
                  variant="ghost"
                  loading={busy}
                  onClick={() => disconnect(false)}
                  size="sm"
                  className="border-on-fill/40 text-on-fill hover:bg-on-fill/15"
                >
                  Putuskan hubungan
                </Button>
              </div>
            </div>

            {liveSensorFresh && liveSensorFresh.heightCm >= 3 && (
              <div className="patch patch-linen flex flex-wrap items-center justify-between gap-3 border-2 border-thread p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Alas sensor membaca botol</p>
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
            className="patch patch-linen grid gap-3 border-2 border-danger p-6"
          >
            <Chip tone="danger">Akses Terkunci</Chip>
            <h2 className="text-3xl">Sedang dipakai {session.userName}</h2>
            <p className="text-ink-soft">
              Stasiun deteksi ini sedang terhubung dengan akun {session.userName}, sehingga pengguna lain tidak bisa
              masuk atau mengklaim hasil deteksinya. Tunggu sampai ia selesai dan memutuskan hubungan.
            </p>
            <LinkButton href="/dashboard" variant="ghost" className="w-fit">
              Kembali ke Dashboard
            </LinkButton>
          </motion.section>
        ) : (
          <motion.section
            key="free"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="patch grid gap-4 p-6"
          >
            <h2 className="text-3xl">
              {disconnectedByUser ? "Hubungan dengan Stasiun Diputus" : `Siap Hubungkan ke ${data.name}`}
            </h2>
            <p className="text-ink-soft">
              {disconnectedByUser
                ? "Sesi setor botolmu sudah selesai. Stasiun sekarang terbuka untuk pengunjung berikutnya."
                : "Menghubungkan akunmu agar setiap botol yang dideteksi tercatat khusus atas namamu."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="thread" loading={busy} onClick={manualConnect} className="min-h-12 flex-1">
                {disconnectedByUser ? "Hubungkan Ulang" : `Hubungkan ke ${data.name}`}
              </Button>
              <LinkButton href="/dashboard" variant="ghost" className="min-h-12">
                Ke Dashboard
              </LinkButton>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Dukungan opsional jika user memindai tiket QR sekali pakai secara langsung. */
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

  if (depositDoc.loading) return <LoadingBlock label="Memeriksa tiket QR..." />;
  if (depositDoc.error) return <ErrorState title="Tiket belum bisa dibuka">Periksa koneksi internetmu.</ErrorState>;
  if (!deposit) {
    return (
      <div className="mx-auto grid max-w-md gap-4">
        <ErrorState title="Tiket QR tidak ditemukan">Pastikan kamu scan QR terbaru dari stasiun.</ErrorState>
        <LinkButton href="/scan" variant="thread">
          Scan ulang
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

  return (
    <div className="mx-auto grid max-w-md gap-5">
      <PageTitle title="Klaim Poin Botol" className="mb-0">
        {deposit.binName}
      </PageTitle>
      {claimedByMe ? (
        <div className="patch patch-denim relative grid gap-4 overflow-hidden p-6 text-center">
          <Burst count={14} />
          <Chip tone="thread">Berhasil Diklaim</Chip>
          <p className="font-display text-3xl font-black">+{deposit.points} Poin Masuk</p>
          <LinkButton href="/dashboard" variant="thread">
            Lihat Saldo di Dashboard
          </LinkButton>
        </div>
      ) : claimedByOther ? (
        <ErrorState title="QR Ini Sudah Diklaim Orang Lain">
          Satu tiket hanya bisa diklaim oleh orang pertama.
        </ErrorState>
      ) : isExpired ? (
        <ErrorState title="QR Sudah Hangus">Batas waktu klaim telah habis.</ErrorState>
      ) : (
        <article className="receipt grid gap-4 px-6 pb-9 pt-5">
          <div className="flex items-center justify-between gap-4">
            <Chip tone="denim">Tiket Siap Diklaim</Chip>
            <Countdown expiresAt={deposit.expiresAt} totalMs={totalMs(deposit)} size={56} label="Batas klaim" />
          </div>
          <Points value={deposit.points} size={24} className="text-3xl" />
          <Button variant="thread" loading={busy} onClick={handleClaim} className="min-h-14 w-full text-lg">
            Klaim +{deposit.points} Poin
          </Button>
        </article>
      )}
    </div>
  );
}
