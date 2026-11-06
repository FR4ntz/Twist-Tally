"use client";

import Link from "next/link";
import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { fillPercent, formatNumber } from "@/lib/format";
import { liveSession } from "@/lib/actions";
import { useCollection, useNow } from "@/lib/hooks";
import type { Bin, LedgerEntry, Reward } from "@/lib/types";
import { BinArt } from "./bin-art";
import { Bottle } from "./bottle-art";
import { Countdown } from "./countdown";
import { Kancing } from "./icons";
import { LedgerRow } from "./rows";
import { Chip, EmptyState, ErrorState, FillGauge, LinkButton, LoadingBlock } from "./ui";

export function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(reduce ? value : 0);
  const text = useTransform(motionValue, (v) => formatNumber(Math.round(v)));

  useEffect(() => {
    if (reduce) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, { duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [value, reduce, motionValue]);

  return <motion.span>{text}</motion.span>;
}

export function HomeView() {
  const { profile } = useAuth();
  const uid = profile?.id ?? null;
  const rewards = useCollection<Reward>({ path: "rewards", orderBy: ["pointsCost", "asc"], limit: 30 });
  const bins = useCollection<Bin>({ path: "bins" });
  const now = useNow(5000);
  const ledger = useCollection<LedgerEntry>(
    uid ? { path: `users/${uid}/ledger`, orderBy: ["createdAt", "desc"], limit: 5 } : null,
  );

  if (!profile) return null;

  const connected = (bins.data ?? []).find((b) => liveSession(b, now)?.userId === profile.id) ?? null;
  const connectedSession = connected ? liveSession(connected, now) : null;

  const available = (rewards.data ?? []).filter((r) => r.active && r.stock > 0);
  const target = available.find((r) => r.pointsCost > profile.points) ?? null;
  const affordable = available.filter((r) => r.pointsCost <= profile.points);
  const progress = target ? Math.min(100, Math.round((profile.points / target.pointsCost) * 100)) : 100;

  return (
    <div className="grid gap-8">
      {connected && connectedSession && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            href={`/hubung?sampah=${connected.sampahId}`}
            className="patch patch-ink flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5"
          >
            <span className="rounded-full bg-card p-0.5 text-ink">
              <Countdown expiresAt={connectedSession.expiresAt} totalMs={5 * 60_000} size={52} label="Sisa waktu sambungan" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-2xl font-black leading-tight">Tersambung ke {connected.name}</span>
              <span className="block text-sm text-on-fill/85">Masukkan botolmu, poinnya tercatat atas namamu.</span>
            </span>
          </Link>
        </motion.div>
      )}
      <section aria-labelledby="saldo" className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="patch patch-denim overflow-hidden p-6 sm:p-7">
          <Bottle height={84} className="pointer-events-none absolute right-4 top-3 rotate-[14deg] opacity-95" />
          <p className="text-on-fill/85">Halo, {profile.name}</p>
          <h1 id="saldo" className="sr-only">
            Saldo poin
          </h1>
          <p className="mt-3 flex items-center gap-3 font-display font-black leading-none">
            <Kancing size={46} className="shrink-0 text-thread [--kancing-hole:#2a5090]" />
            <span className="text-[4.5rem] sm:text-[5.5rem]" aria-hidden="true">
              <CountUp value={profile.points} />
            </span>
            <span className="sr-only">{profile.points} poin</span>
            <span className="self-end pb-2 text-2xl font-bold" aria-hidden="true">
              poin
            </span>
          </p>
          <p className="mt-4 text-on-fill/90">
            {profile.totalBottles > 0
              ? `${formatNumber(profile.totalBottles)} botol sudah kamu setor.`
              : "Belum ada botol yang kamu setor."}
          </p>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-patch border-2 border-dashed border-stitch p-5">
          {rewards.loading ? (
            <LoadingBlock label="Mencari hadiah terdekat..." />
          ) : target ? (
            <div>
              <p className="text-sm text-ink-soft">Hadiah terdekat</p>
              <div className="flex items-center gap-3">
                {target.imageUrl && (
                  // Alamat gambar diisi admin dan bisa dari host mana pun, jadi tidak lewat next/image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={target.imageUrl}
                    alt=""
                    width={96}
                    height={60}
                    className="aspect-[8/5] w-24 shrink-0 rounded-[8px] bg-paper-deep object-cover"
                  />
                )}
                <p className="font-display text-3xl font-black leading-tight">{target.name}</p>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={target.pointsCost}
                aria-valuenow={profile.points}
                aria-label={`Poin menuju ${target.name}`}
                className="mt-3 h-4 overflow-hidden rounded-[4px] border-2 border-dashed border-stitch"
              >
                <motion.div
                  className="h-full bg-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
              <p className="mt-2 text-sm">
                Kurang <strong>{target.pointsCost - profile.points} poin</strong> lagi.
              </p>
            </div>
          ) : affordable.length > 0 ? (
            <div>
              <p className="text-sm text-ink-soft">Poinmu cukup</p>
              <p className="font-display text-3xl font-black leading-tight">
                {affordable.length} hadiah siap ditukar
              </p>
            </div>
          ) : (
            <div>
              <p className="font-display text-2xl font-black">Katalog hadiah belum diisi</p>
              <p className="mt-1 text-sm text-ink-soft">Admin akan menambahkan hadiah di sini.</p>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
            <LinkButton href="/scan" variant="thread">
              Scan QR tempat sampah
            </LinkButton>
            <LinkButton href="/tukar" variant="ghost">
              Lihat hadiah
            </LinkButton>
          </div>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
        <section aria-labelledby="setoran">
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 id="setoran" className="text-3xl">
              Aktivitas terakhir
            </h2>
            <Link href="/riwayat" className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">
              Semua riwayat
            </Link>
          </div>
          {ledger.loading ? (
            <LoadingBlock label="Memuat aktivitasmu..." />
          ) : ledger.error ? (
            <ErrorState title="Aktivitas belum bisa dimuat">
              Periksa koneksi internetmu, lalu muat ulang halaman ini.
            </ErrorState>
          ) : ledger.data && ledger.data.length > 0 ? (
            <ul className="receipt divide-y-2 divide-dashed divide-stitch px-5 pb-8 pt-2">
              {ledger.data.map((entry) => (
                <LedgerRow key={entry.id} entry={entry} />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Belum ada setoran"
              action={
                <LinkButton href="/scan" size="sm">
                  Scan QR sekarang
                </LinkButton>
              }
            >
              Buang botol ke tempat sampah Twist &amp; Tally, lalu scan QR di layarnya. Setoran pertamamu muncul di sini.
            </EmptyState>
          )}
        </section>

        <section aria-labelledby="bin">
          <h2 id="bin" className="mb-2 text-3xl">
            Tempat sampah
          </h2>
          {bins.loading ? (
            <LoadingBlock label="Memuat daftar tempat sampah..." />
          ) : bins.error ? (
            <ErrorState title="Daftar tempat sampah belum bisa dimuat">Muat ulang halaman ini sebentar lagi.</ErrorState>
          ) : bins.data && bins.data.length > 0 ? (
            <ul className="grid gap-3">
              {bins.data.map((bin) => {
                const percent = fillPercent(bin.bottleCount, bin.capacityBottles);
                return (
                  <li key={bin.id}>
                    <Link
                      href={`/hubung?sampah=${bin.sampahId}`}
                      className="patch patch-linen flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5"
                    >
                      <BinArt percent={percent} className="w-16 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block break-words font-display text-2xl font-black leading-tight">{bin.name}</span>
                            <span className="block break-words text-sm text-ink-soft">
                              {bin.location} · {bin.sampahId}
                            </span>
                          </span>
                          {percent >= 80 && <Chip tone="thread">Hampir penuh</Chip>}
                        </span>
                        <span className="mt-2 block">
                          <FillGauge percent={percent} label={`Isi ${bin.name}`} />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Belum ada tempat sampah">
              Tempat sampah muncul di sini setelah admin mendaftarkannya.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
