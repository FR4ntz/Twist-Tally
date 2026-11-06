"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ActionError, connectToBin, disconnectFromBin, liveSession } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { extractSampahId, fillPercent } from "@/lib/format";
import { useDoc, useNow } from "@/lib/hooks";
import { withDefaults } from "@/lib/points";
import type { Bin, PointsSettings } from "@/lib/types";
import { BinArt } from "./bin-art";
import { ClaimCard, useMyDeposits } from "./claims";
import { Countdown } from "./countdown";
import { Icon } from "./icons";
import { toast } from "./providers";
import { Button, Chip, ErrorState, FillGauge, LinkButton, LoadingBlock, PageTitle } from "./ui";

export function ConnectView() {
  const sampahId = extractSampahId(useSearchParams().get("sampah") ?? "");
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
  const session = liveSession(data, now);
  const mine = session?.userId === user?.uid;
  const taken = session !== null && !mine;
  const percent = fillPercent(data.bottleCount, data.capacityBottles);
  const myPending = (deposits.data ?? [])
    .filter((d) => d.binId === data.sampahId && d.status === "pending" && d.expiresAt.toMillis() > now)
    .sort((a, b) => a.expiresAt.toMillis() - b.expiresAt.toMillis());

  async function connect() {
    if (!profile) return;
    setBusy(true);
    try {
      await connectToBin(data.sampahId, profile, settings.sessionExpiryMinutes);
      toast.ok(`Akunmu tersambung ke ${data.name}. Masukkan botolmu.`);
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

      <AnimatePresence mode="wait">
        {mine && session ? (
          <motion.section
            key="mine"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            aria-labelledby="sesi"
            className="patch patch-denim grid gap-4 p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[12rem] flex-1">
                <h2 id="sesi" className="text-3xl sm:text-4xl">
                  Terhubung, masukkan botolmu
                </h2>
                <p className="mt-2 text-on-fill/90">
                  Masukkan botol satu per satu. Sensor membaca tinggi dan jumlahnya atas nama {session.userName}, lalu
                  poinnya muncul di sini.
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
            <p className="text-sm text-on-fill/85">
              Setelah poin masuk, kamu punya {settings.depositExpiryMinutes} menit untuk mengklaimnya. Lewat dari itu poin
              hangus.
            </p>
            <Button variant="thread" loading={busy} onClick={disconnect} className="w-fit" size="sm">
              Putuskan sambungan
            </Button>
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
              Hubungkan ke {data.name}
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

      <Link href="/beranda" className="inline-flex min-h-11 w-fit items-center font-bold underline underline-offset-4">
        Kembali ke beranda
      </Link>
    </div>
  );
}
