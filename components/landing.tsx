"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import { useCollection, useDoc } from "@/lib/hooks";
import { sortTiers, withDefaults } from "@/lib/points";
import type { Bin, PointsSettings, Reward } from "@/lib/types";
import heroStationImg from "@/public/images/hero-recycle-station.jpg";
import { BinArt } from "./bin-art";
import { BottleTrio } from "./bottle-art";
import { FabricBackdrop } from "./fabric-backdrop";
import { Icon, KainMark } from "./icons";
import { Logo } from "./logo";
import { Mascot } from "./mascot";
import { Button, Chip, LinkButton, Points } from "./ui";

const DEMO_CAPACITY = 12;
const SMOOTH_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function Landing() {
  const { user, profile, loading } = useAuth();
  const member = !loading && user !== null && profile !== null;

  const settingsDoc = useDoc<PointsSettings>("settings/points");
  const rewards = useCollection<Reward>({ path: "rewards", orderBy: ["pointsCost", "asc"], limit: 12 });
  const bins = useCollection<Bin>({ path: "bins" });

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 28, restDelta: 0.001 });

  const settings = withDefaults(settingsDoc.data);
  const tiers = sortTiers(settings.tiers);
  const catalog = (rewards.data ?? []).filter((r) => r.active).slice(0, 3);
  const totalCommunityBottles = (bins.data ?? []).reduce((sum, b) => sum + b.totalBottles, 0);
  const totalPointsIssued = (bins.data ?? []).reduce((sum, b) => sum + (b.pointsIssued ?? 0), 0);
  const activeBinsCount = bins.data?.length ?? 0;

  const steps = [
    {
      title: "Scan QR di stasiun botol",
      body: "Satu kali scan lewat menu Scan QR menghubungkan akunmu secara eksklusif ke stasiun sensor Twist & Tally.",
    },
    {
      title: "Deteksi ukuran 1 atau banyak botol",
      body: "Taruh botol di atas alas sensor ultrasonik. Sistem membaca tinggi tiap botol dan mengumpulkan poinnya secara langsung.",
    },
    {
      title: `Klaim poin & putuskan hubungan`,
      body: `Klaim total poinmu sebelum batas ${settings.depositExpiryMinutes} menit, lalu hubungan otomatis dilepas agar pengguna lain dapat giliran.`,
    },
    {
      title: "Tukar jadi produk daur ulang",
      body: "Pilih hadiah di katalog, tukar poinmu, dan tunjukkan kode voucher ke admin untuk mengambil hasilnya.",
    },
  ];

  return (
    <div className="min-h-dvh overflow-x-clip">
      <motion.div
        aria-hidden="true"
        style={{ scaleX }}
        className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-thread"
      />

      <header className="sticky top-0 z-40 border-b border-edge/30 bg-paper/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
          <Logo href="/" />

          <nav aria-label="Navigasi utama" className="flex items-center gap-5 text-sm font-bold text-ink-soft">
            <a href="#cara-kerja" className="hidden min-h-11 items-center transition-colors hover:text-ink md:inline-flex">
              Cara kerja
            </a>
            <a href="#simulasi" className="hidden min-h-11 items-center transition-colors hover:text-ink md:inline-flex">
              Simulasi
            </a>
            {catalog.length > 0 && (
              <a href="#hadiah" className="hidden min-h-11 items-center transition-colors hover:text-ink md:inline-flex">
                Hadiah
              </a>
            )}
            <a href="#tentang" className="hidden min-h-11 items-center transition-colors hover:text-ink md:inline-flex">
              Tentang
            </a>
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-[10px] border-2 border-ink bg-ink px-3.5 text-paper transition hover:-translate-y-0.5 hover:brightness-115"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero dengan latar gelombang animasi lembut & ilustrasi stasiun daur ulang botol */}
      <section className="gingham relative overflow-hidden border-b border-edge/30">
        <FabricBackdrop variant="hero" />

        <div className="relative z-10 mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: SMOOTH_EASE }}
            className="patch p-6 sm:p-9"
          >
            <Chip tone="denim">Daur Ulang Botol Pintar</Chip>
            <h1 className="mt-3 text-[2.7rem] sm:text-6xl">Botol bekasmu bisa ditukar jadi produk daur ulang.</h1>
            <p className="mt-4 max-w-xl text-lg text-ink-soft">
              Scan QR di stasiun Twist &amp; Tally, taruh botol di atas alas ukur ultrasonik, kumpulkan poinnya, lalu
              tukar dengan berbagai hadiah menarik.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {member ? (
                <>
                  <LinkButton href="/dashboard" variant="thread">
                    Buka Dashboard
                  </LinkButton>
                  <LinkButton href="/scan" variant="ghost">
                    <Icon name="scan" size={20} />
                    Scan QR Stasiun
                  </LinkButton>
                </>
              ) : (
                <>
                  <LinkButton href="/masuk?mode=daftar" variant="thread">
                    Buat akun dan mulai kumpulkan poin
                  </LinkButton>
                  <LinkButton href="/masuk" variant="ghost">
                    Sudah punya akun? Masuk
                  </LinkButton>
                </>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: SMOOTH_EASE }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="patch overflow-hidden p-3 shadow-lg">
              <div className="overflow-hidden rounded-[12px] bg-paper">
                <Image
                  src={heroStationImg}
                  alt="Ilustrasi tempat sampah pintar Twist & Tally mengumpulkan botol plastik PET dan menghasilkan poin hadiah"
                  priority
                  className="h-auto w-full object-cover"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 px-1 pb-1">
                <span className="text-xs font-bold text-ink-soft">Sensor Ukur Tinggi Otomatis</span>
                <Points value={40} size={18} className="text-sm" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="cara-kerja" className="mx-auto max-w-5xl scroll-mt-16 px-4 py-14 sm:px-6">
        {activeBinsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.4, ease: SMOOTH_EASE }}
            className="mb-12 grid gap-4 sm:grid-cols-3"
          >
            <div className="patch patch-denim p-5">
              <p className="text-sm text-on-fill/85">Botol terkumpul bersama</p>
              <p className="mt-1 font-display text-5xl font-black leading-none">{formatNumber(totalCommunityBottles)}</p>
            </div>
            <div className="patch patch-linen p-5">
              <p className="text-sm text-ink-soft">Poin diterbitkan sensor</p>
              <p className="mt-1 font-display text-5xl font-black leading-none">{formatNumber(totalPointsIssued)}</p>
            </div>
            <div className="patch p-5">
              <p className="text-sm text-ink-soft">Stasiun sensor aktif</p>
              <p className="mt-1 font-display text-5xl font-black leading-none">{formatNumber(activeBinsCount)}</p>
            </div>
          </motion.div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_1.35fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.4, ease: SMOOTH_EASE }}
            className="grid gap-6"
          >
            <div className="relative">
              {/* Maskot mengintip dari balik tepi kiri kartu */}
              <motion.div
                initial={{ x: 28, rotate: 0, opacity: 0 }}
                whileInView={{ x: 0, rotate: -16, opacity: 1 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ type: "spring", stiffness: 170, damping: 16, delay: 0.1 }}
                className="pointer-events-none absolute -left-8 top-4 z-0 sm:-left-16 lg:-left-20"
                style={{ transformOrigin: "80% 80%" }}
              >
                <Mascot pose="idle" size={160} float={false} />
              </motion.div>

              <div className="patch relative z-10 p-5 sm:p-6">
                <h2 className="text-4xl sm:text-5xl">Dari botol sampai poin</h2>
                <p className="mt-2.5 max-w-md text-ink-soft">
                  Alur ringkas dari tempat sampah ke ponselmu, lalu botol PET diproses menjadi produk daur ulang baru.
                </p>
              </div>
            </div>

            <BottleTrio scale={0.78} className="py-2" />
          </motion.div>

          <ol className="relative grid gap-5">
            <span aria-hidden="true" className="absolute bottom-6 left-[18px] top-6 w-0.5 bg-edge/35" />
            {steps.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.38, delay: i * 0.06, ease: SMOOTH_EASE }}
                className="patch relative flex items-start gap-4 p-4"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-fill font-display text-lg font-black text-on-fill">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-2xl">{step.title}</h3>
                  <p className="mt-1 text-sm text-ink-soft sm:text-base">{step.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <Calculator tiers={tiers} expiryMinutes={settings.depositExpiryMinutes} />

      {catalog.length > 0 && (
        <section id="hadiah" className="mx-auto max-w-5xl scroll-mt-16 px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-3xl sm:text-4xl">Hadiah yang bisa kamu tukar</h2>
            <Link href="/tukar" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">
              Lihat seluruh katalog
            </Link>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {catalog.map((reward, i) => (
              <motion.li
                key={reward.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.35, delay: i * 0.06, ease: SMOOTH_EASE }}
                whileHover={{ y: -4 }}
                className="patch flex flex-col gap-2 p-5"
              >
                {reward.imageUrl && (
                  // Alamat gambar diisi admin dan bisa dari host mana pun, jadi tidak lewat next/image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={reward.imageUrl}
                    alt={reward.name}
                    width={320}
                    height={200}
                    loading="lazy"
                    className="aspect-[8/5] w-full rounded-[10px] bg-paper-deep object-cover"
                  />
                )}
                <span className="text-xs font-bold text-ink-soft">{reward.category}</span>
                <span className="font-display text-2xl font-black leading-tight">{reward.name}</span>
                <Points value={reward.pointsCost} className="mt-auto pt-2" />
              </motion.li>
            ))}
          </ul>
        </section>
      )}

      <footer id="tentang" className="scroll-mt-16 border-t border-edge/30 px-4 py-10 text-sm text-ink-soft sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Mascot pose="calm" size={104} float={false} />
            <p className="max-w-xl">
              Twist &amp; Tally adalah proyek mahasiswa lintas prodi. Botol PET yang terkumpul dicacah lalu dipres panas
              menjadi bahan produk baru.
            </p>
          </div>
          <Link href="/admin" className="inline-flex min-h-11 items-center font-bold text-ink underline underline-offset-4">
            Panel admin
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Calculator({ tiers, expiryMinutes }: { tiers: ReturnType<typeof sortTiers>; expiryMinutes: number }) {
  const [dropped, setDropped] = useState<number[]>([]);
  const [dropId, setDropId] = useState(0);
  const full = dropped.length >= DEMO_CAPACITY;
  const total = dropped.reduce((sum, i) => sum + (tiers[i]?.points ?? 0), 0);

  function add(tierIndex: number) {
    if (full) return;
    setDropped((list) => [...list, tierIndex]);
    setDropId((n) => n + 1);
  }

  return (
    <section id="simulasi" aria-labelledby="coba" className="relative scroll-mt-16 overflow-hidden border-y border-edge/30 bg-paper-deep/90">
      <FabricBackdrop variant="subtle" />
      <div className="relative z-10 mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[auto_1fr] md:items-center">
        <BinArt percent={Math.round((dropped.length / DEMO_CAPACITY) * 100)} drop={dropId > 0 ? { id: dropId } : null} className="mx-auto w-56 md:w-64" />
        <div>
          <h2 id="coba" className="text-3xl sm:text-4xl">
            Coba setor botol
          </h2>
          <p className="mt-2 max-w-xl text-ink-soft">
            Pilih ukuran botol untuk menjatuhkannya ke tempat sampah. Poin dihitung dari tinggi botol dengan aturan yang
            sama seperti sensor sungguhan.
          </p>

          <ul className="mt-5 grid grid-cols-3 gap-3">
            {tiers.map((tier, i) => (
              <li key={tier.label}>
                <motion.button
                  type="button"
                  whileHover={full ? undefined : { y: -4 }}
                  whileTap={full ? undefined : { scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  onClick={() => add(i)}
                  disabled={full}
                  className="patch flex min-h-32 w-full flex-col items-center justify-end gap-1 px-2 pb-3 pt-2 text-center disabled:opacity-50"
                >
                  <span className="text-ink-soft">
                    <Icon name="bottle" size={30 + i * 14} />
                  </span>
                  <span className="font-display text-xl font-black leading-none">{tier.label}</span>
                  <span className="text-xs text-ink-soft">
                    {tier.upToCm === null
                      ? `di atas ${tiers[i - 1]?.upToCm ?? 0} cm`
                      : i === 0
                        ? `sampai ${tier.upToCm} cm`
                        : `${(tiers[i - 1]?.upToCm ?? 0) + 1} sampai ${tier.upToCm} cm`}
                  </span>
                  <Points value={tier.points} size={16} className="text-sm" />
                  <span className="sr-only">. Tambah satu botol {tier.label.toLowerCase()}</span>
                </motion.button>
              </li>
            ))}
          </ul>

          <div className="patch mt-5 flex flex-wrap items-center justify-between gap-4 px-5 py-4" aria-live="polite">
            <div className="flex items-center gap-4">
              <Mascot pose={total > 0 ? "cheer" : "idle"} size={114} />
              <div>
                <p className="text-sm text-ink-soft">
                  {dropped.length === 0
                    ? "Belum ada botol di dalam."
                    : full
                      ? "Tempat sampah penuh. Kosongkan untuk mencoba lagi."
                      : `${dropped.length} botol di dalam`}
                </p>
                <AnimatePresence mode="popLayout">
                  <motion.p
                    key={total}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-2 font-display text-5xl font-black leading-none"
                  >
                    <KainMark size={30} className="text-thread [--kain-line:#2a1b00]" />
                    {total}
                    <span className="text-xl font-bold">poin</span>
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
            <Button variant="ghost" size="sm" disabled={dropped.length === 0} onClick={() => setDropped([])}>
              Kosongkan
            </Button>
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            Di stasiun asli, poin ini muncul di aplikasimu dan hangus bila tidak diklaim dalam {expiryMinutes} menit.
          </p>
        </div>
      </div>
    </section>
  );
}
