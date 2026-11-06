"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { liveSession } from "@/lib/actions";
import { extractSampahId, fillPercent } from "@/lib/format";
import { useCollection, useDoc, useNow } from "@/lib/hooks";
import { withDefaults } from "@/lib/points";
import type { Bin, PointsSettings } from "@/lib/types";
import { BinArt } from "./bin-art";
import { Countdown } from "./countdown";
import { Icon } from "./icons";
import { Logo } from "./logo";
import { EmptyState, ErrorState, FillGauge, LoadingBlock, Points } from "./ui";

const subscribeOrigin = () => () => {};

function useOrigin() {
  return useSyncExternalStore(
    subscribeOrigin,
    () => window.location.origin,
    () => "",
  );
}

export function BinScreen() {
  const raw = useSearchParams().get("id");
  const id = extractSampahId(raw ?? "");
  return id ? <Screen id={id} /> : <Picker invalid={Boolean(raw)} />;
}

function Picker({ invalid }: { invalid: boolean }) {
  const bins = useCollection<Bin>({ path: "bins" });
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Logo />
      <h1 className="mb-2 mt-6 text-4xl sm:text-5xl">Layar tempat sampah</h1>
      <p className="mb-6 text-ink-soft">
        Pilih tempat sampah yang layarnya ingin ditampilkan. Halaman ini dibuka di perangkat yang dipasang di tempat sampah.
      </p>
      {invalid && <ErrorState title="ID tidak valid">ID berbentuk SB- diikuti 4 huruf atau angka. Pilih dari daftar di bawah.</ErrorState>}
      {bins.loading ? (
        <LoadingBlock label="Memuat daftar tempat sampah..." />
      ) : bins.error ? (
        <ErrorState title="Daftar tempat sampah belum bisa dimuat">Periksa koneksi internet, lalu muat ulang halaman.</ErrorState>
      ) : bins.data && bins.data.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {bins.data.map((bin) => (
            <li key={bin.id}>
              <Link href={`/bin?id=${bin.sampahId}`} className="patch flex min-h-16 items-center justify-between gap-3 p-4 hover:-translate-y-0.5">
                <span>
                  <span className="block font-display text-2xl font-black leading-tight">{bin.name}</span>
                  <span className="block text-sm text-ink-soft">
                    {bin.location} · {bin.sampahId}
                  </span>
                </span>
                <Icon name="forward" size={22} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Belum ada tempat sampah">Admin perlu mendaftarkan tempat sampah dulu di panel admin.</EmptyState>
      )}
    </div>
  );
}

function Screen({ id }: { id: string }) {
  const bin = useDoc<Bin>(`bins/${id}`);
  const settingsDoc = useDoc<PointsSettings>("settings/points");
  const origin = useOrigin();
  const now = useNow(500);

  if (bin.loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <LoadingBlock label="Menghubungkan ke tempat sampah..." />
      </div>
    );
  }
  if (bin.error || !bin.data) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-md place-items-center px-4">
        <ErrorState title="Tempat sampah tidak ditemukan">
          Tidak ada tempat sampah dengan ID {id}. Pilih dari daftar di{" "}
          <Link href="/bin" className="font-bold underline">
            halaman layar
          </Link>
          .
        </ErrorState>
      </div>
    );
  }

  const data = bin.data;
  const settings = withDefaults(settingsDoc.data);
  const session = liveSession(data, now);
  const pending = data.pendingDeposit && data.pendingDeposit.expiresAt.toMillis() > now ? data.pendingDeposit : null;
  const percent = fillPercent(data.bottleCount, data.capacityBottles);

  return (
    <main className="mx-auto grid min-h-dvh max-w-4xl content-between gap-6 px-4 py-6 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Logo />
          <p className="mt-1 text-sm text-ink-soft">
            {data.name}, {data.location}
          </p>
        </div>
        <p className="whitespace-nowrap rounded-[10px] bg-paper-deep px-3 py-1.5 font-mono text-base font-bold tracking-wider sm:text-lg">{data.sampahId}</p>
      </header>

      <div className="grid items-stretch gap-5 md:grid-cols-[auto_1fr]">
        <section aria-labelledby="qr-title" className="patch grid place-items-center gap-3 p-5 text-center">
          <h1 id="qr-title" className="text-3xl">
            Scan untuk mulai
          </h1>
          <div className="rounded-[14px] bg-white p-3.5">
            <QRCodeSVG value={`${origin}/hubung?sampah=${data.sampahId}`} size={200} level="M" title={`QR tempat sampah ${data.sampahId}`} />
          </div>
          <p className="max-w-[14rem] text-sm text-ink-soft">
            Buka menu Scan di aplikasi Twist &amp; Tally. Atau ketik ID {data.sampahId}.
          </p>
        </section>

        <section aria-live="polite" className="grid content-between gap-4">
          <AnimatePresence mode="wait">
            {session ? (
              <motion.div
                key="session"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="patch patch-denim flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"
              >
                <div className="min-w-[12rem] flex-1">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl">Terhubung dengan {session.userName}</h2>
                  <p className="mt-2 text-lg text-on-fill/90">Masukkan botol satu per satu. Sensor sedang membaca.</p>
                </div>
                <div className="rounded-full bg-card p-0.5 text-ink">
                  <Countdown expiresAt={session.expiresAt} totalMs={settings.sessionExpiryMinutes * 60_000} size={64} label="Sisa waktu sambungan" />
                </div>
              </motion.div>
            ) : pending ? (
              <motion.div
                key="pending"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="patch patch-ink flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"
              >
                <div className="min-w-[12rem] flex-1">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl">{pending.userName}, klaim poinmu</h2>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 text-lg">
                    {pending.bottleCount} botol terhitung,
                    <Points value={pending.points} className="text-thread" size={22} />
                  </p>
                  <p className="mt-1 text-on-fill/85">Buka aplikasi dan klaim sebelum hitung mundur habis.</p>
                </div>
                <div className="rounded-full bg-card p-0.5 text-ink">
                  <Countdown expiresAt={pending.expiresAt} totalMs={settings.depositExpiryMinutes * 60_000} size={64} label="Batas klaim" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="patch p-6"
              >
                <span className="text-fill">
                  <Icon name="bottle" size={44} />
                </span>
                <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl">Siap menerima botol</h2>
                <p className="mt-2 max-w-md text-lg text-ink-soft">
                  Scan QR di samping dulu supaya poin dari botolmu tercatat atas namamu.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-4">
            <BinArt percent={percent} className="w-28 shrink-0" />
            <div className="grid flex-1 gap-1.5">
              <p className="text-sm text-ink-soft">
                Isi tempat sampah{percent >= 90 ? ", hampir penuh" : ""}
              </p>
              <FillGauge percent={percent} label={`Isi ${data.name}`} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
