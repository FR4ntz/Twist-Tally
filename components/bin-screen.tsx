"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { fillPercent, groupCode } from "@/lib/format";
import { useCollection, useDoc, useNow } from "@/lib/hooks";
import type { Bin } from "@/lib/types";
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
  const id = useSearchParams().get("id");
  return id ? <Screen id={id} /> : <Picker />;
}

function Picker() {
  const bins = useCollection<Bin>({ path: "bins" });
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Logo />
      <h1 className="mb-2 mt-6 text-4xl sm:text-5xl">Layar tempat sampah</h1>
      <p className="mb-6 text-ink-soft">Pilih tempat sampah yang layarnya ingin ditampilkan. Halaman ini bisa dibuka di perangkat yang dipasang di tempat sampah.</p>
      {bins.loading ? (
        <LoadingBlock label="Memuat daftar tempat sampah..." />
      ) : bins.error ? (
        <ErrorState title="Daftar tempat sampah belum bisa dimuat">Periksa koneksi internet, lalu muat ulang halaman.</ErrorState>
      ) : bins.data && bins.data.length > 0 ? (
        <ul className="grid gap-3">
          {bins.data.map((bin) => (
            <li key={bin.id}>
              <Link href={`/bin?id=${bin.id}`} className="patch flex min-h-16 items-center justify-between gap-3 p-4 hover:-translate-y-0.5">
                <span>
                  <span className="block font-display text-2xl font-black leading-tight">{bin.name}</span>
                  <span className="block text-sm text-ink-soft">{bin.location}</span>
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
  const origin = useOrigin();
  const now = useNow();

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
          Periksa alamat halaman ini, atau pilih dari daftar di <Link href="/bin" className="font-bold underline">halaman layar</Link>.
        </ErrorState>
      </div>
    );
  }

  const data = bin.data;
  const deposit = data.currentDeposit && data.currentDeposit.expiresAt.toMillis() > now ? data.currentDeposit : null;
  const percent = fillPercent(data.bottleCount, data.capacityBottles);
  const msLeft = deposit ? deposit.expiresAt.toMillis() - now : 0;
  const minutes = Math.floor(msLeft / 60000);
  const seconds = Math.floor((msLeft % 60000) / 1000);

  return (
    <main className="mx-auto grid min-h-dvh max-w-3xl content-between gap-6 px-4 py-6 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Logo />
          <p className="mt-1 text-sm text-ink-soft">
            {data.name}, {data.location}
          </p>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {deposit ? (
          <motion.section
            key="qr"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            aria-labelledby="qr-title"
            className="patch patch-denim grid gap-5 p-6 text-center sm:grid-cols-[auto_1fr] sm:items-center sm:text-left"
          >
            <div className="mx-auto rounded-[14px] bg-white p-4">
              <QRCodeSVG value={`${origin}/klaim?kode=${deposit.code}`} size={220} level="M" title="QR klaim poin" />
            </div>
            <div className="grid gap-3">
              <h1 id="qr-title" className="text-4xl sm:text-5xl">
                Scan untuk klaim poin
              </h1>
              <p className="text-lg">
                {deposit.bottleCount} botol terhitung, <Points value={deposit.points} className="text-thread" size={22} />
              </p>
              <p>
                Buka menu Scan di aplikasi Twist &amp; Tally. Atau tulis kode ini:{" "}
                <span className="font-mono text-xl font-bold tracking-[0.12em]">{groupCode(deposit.code)}</span>
              </p>
              <p className="text-sm text-on-fill/85" role="timer">
                Kode berlaku {minutes} menit {String(seconds).padStart(2, "0")} detik lagi.
              </p>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-labelledby="idle-title"
            className="patch p-6 sm:p-9"
          >
            <span className="text-fill">
              <Icon name="bottle" size={56} />
            </span>
            <h1 id="idle-title" className="mt-3 text-5xl sm:text-6xl">
              Masukkan botol plastik
            </h1>
            <p className="mt-3 max-w-lg text-lg text-ink-soft">
              Masukkan botol satu per satu. Setelah botol terakhir, kode QR untuk klaim poin muncul di layar ini.
            </p>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="grid gap-2">
        <p className="text-sm text-ink-soft">
          Isi tempat sampah{percent >= 90 ? ", hampir penuh" : ""}
        </p>
        <FillGauge percent={percent} label={`Isi ${data.name}`} />
      </footer>
    </main>
  );
}
