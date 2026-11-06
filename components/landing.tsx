"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useCollection, useDoc } from "@/lib/hooks";
import { sortTiers, withDefaults } from "@/lib/points";
import type { PointsSettings, Reward } from "@/lib/types";
import { BinArt } from "./bin-art";
import { BottleTrio } from "./bottle-art";
import { Icon, Kancing } from "./icons";
import { Logo } from "./logo";
import { Button, LinkButton, Points } from "./ui";

const DEMO_CAPACITY = 12;

export function Landing() {
  const { user, loading } = useAuth();
  const member = !loading && user !== null;
  const settingsDoc = useDoc<PointsSettings>("settings/points");
  const rewards = useCollection<Reward>({ path: "rewards", orderBy: ["pointsCost", "asc"], limit: 12 });

  const settings = withDefaults(settingsDoc.data);
  const tiers = sortTiers(settings.tiers);
  const catalog = (rewards.data ?? []).filter((r) => r.active).slice(0, 3);

  const steps = [
    {
      title: "Scan QR di tempat sampah",
      body: "QR yang tertempel di tempat sampah menghubungkan akunmu ke sensornya. Tiap tempat sampah punya ID sendiri, misalnya SB-7K3P.",
    },
    {
      title: "Masukkan botolmu",
      body: "Sensor ultrasonik membaca tinggi tiap botol dan menghitung jumlahnya atas nama akunmu.",
    },
    {
      title: `Klaim dalam ${settings.depositExpiryMinutes} menit`,
      body: "Poin dari sensor muncul di aplikasi dengan hitung mundur. Klaim sebelum waktunya habis, kalau tidak poinnya hangus.",
    },
    {
      title: "Tukar di katalog",
      body: "Pilih hadiah, tukar poinnya, lalu tunjukkan kode voucher ke admin untuk mengambil barangnya.",
    },
  ];

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-1 sm:px-6">
        <Logo />
        <LinkButton href={member ? "/beranda" : "/masuk"} variant="ghost" size="sm">
          {member ? "Buka beranda" : "Masuk"}
        </LinkButton>
      </header>

      <section className="gingham border-y-2 border-dashed border-stitch">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:py-16">
          <div className="patch p-6 sm:p-9">
            <h1 className="text-[2.7rem] sm:text-6xl">Botol bekasmu bisa ditukar jadi produk daur ulang.</h1>
            <p className="mt-4 max-w-xl text-lg text-ink-soft">
              Scan QR di tempat sampah Twist &amp; Tally, lalu masukkan botolmu. Sensor menghitung jumlah dan tinggi botol,
              poinnya tercatat atas namamu, dan kamu tinggal klaim di aplikasi.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {member ? (
                <>
                  <LinkButton href="/beranda" variant="thread">
                    Buka beranda dan lihat poinmu
                  </LinkButton>
                  <LinkButton href="/scan" variant="ghost">
                    Scan QR tempat sampah
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
          </div>

          <div className="mx-auto w-full max-w-sm lg:max-w-none">
            <BottleTrio />
            <motion.figure
              initial={{ y: -40, rotate: -6, opacity: 0 }}
              animate={{ y: 0, rotate: 2.5, opacity: 1 }}
              transition={{ type: "spring", stiffness: 140, damping: 14, delay: 0.55 }}
              className="mx-auto mt-9 w-full max-w-[17rem] lg:ml-auto lg:mr-0"
              aria-label="Contoh struk setoran"
            >
              <div className="receipt px-6 pb-9 pt-6 text-ink">
                <p className="text-xs font-bold text-ink-soft">CONTOH TAMPILAN STRUK</p>
                <p className="mt-2 font-display text-3xl font-black">Setoran selesai</p>
                <dl className="mt-4 grid gap-2 border-y-2 border-dashed border-stitch py-4 text-sm">
                  <div className="flex justify-between">
                    <dt>2 botol sedang</dt>
                    <dd className="font-bold">20 poin</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>1 botol besar</dt>
                    <dd className="font-bold">20 poin</dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-bold">Total</span>
                  <Points value={40} size={22} className="text-2xl" />
                </div>
              </div>
            </motion.figure>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-4xl sm:text-5xl">Dari botol sampai poin</h2>
            <p className="mt-3 max-w-sm text-ink-soft">
              Satu alur dari tempat sampah ke ponselmu. Tidak ada kartu atau perangkat tambahan.
            </p>
          </div>
          <ol className="relative grid gap-7">
            <span aria-hidden="true" className="absolute bottom-6 left-[15px] top-6 border-l-2 border-dashed border-stitch" />
            {steps.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: 14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="relative flex gap-4"
              >
                <Kancing size={32} className="relative z-10 shrink-0 bg-paper text-fill [--kancing-hole:#fbf8f1]" />
                <div>
                  <h3 className="text-2xl">{step.title}</h3>
                  <p className="mt-1 max-w-md text-ink-soft">{step.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <Calculator tiers={tiers} expiryMinutes={settings.depositExpiryMinutes} />

      {catalog.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-3xl sm:text-4xl">Hadiah yang bisa kamu tukar</h2>
            <Link href="/tukar" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">
              Lihat seluruh katalog
            </Link>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {catalog.map((reward) => (
              <motion.li
                key={reward.id}
                whileHover={{ rotate: 2, y: -3 }}
                style={{ transformOrigin: "50% 0" }}
                className="patch patch-linen flex flex-col gap-2 p-5"
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
                    className="aspect-[8/5] w-full rounded-[8px] bg-paper-deep object-cover"
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

      <footer className="border-t-2 border-dashed border-stitch px-4 py-8 text-sm text-ink-soft sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl">
            Twist &amp; Tally adalah proyek mahasiswa lintas prodi. Botol PET yang terkumpul dicacah lalu dipres panas
            menjadi bahan produk baru.
          </p>
          <Link href="/admin" className="inline-flex min-h-11 items-center font-bold text-ink underline underline-offset-4">
            Panel admin
          </Link>
        </div>
      </footer>
    </div>
  );
}

/**
 * Demo hitung poin di browser: pengunjung menjatuhkan botol ke tempat sampah dan melihat poin naik.
 * Angka poin memakai tier asli dari pengaturan admin. Tidak ada yang disimpan.
 */
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
    <section aria-labelledby="coba" className="border-y-2 border-dashed border-stitch bg-paper-deep">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[auto_1fr] md:items-center">
        <BinArt percent={Math.round((dropped.length / DEMO_CAPACITY) * 100)} drop={dropId > 0 ? { id: dropId } : null} className="mx-auto w-56 md:w-64" />
        <div>
          <h2 id="coba" className="text-3xl sm:text-4xl">
            Coba setor botol
          </h2>
          <p className="mt-2 max-w-xl text-ink-soft">
            Pilih ukuran botol untuk menjatuhkannya ke tempat sampah. Poin dihitung dari tinggi botol, dengan aturan yang
            sama seperti sensor sungguhan. Ini hanya simulasi di browser.
          </p>

          <ul className="mt-5 grid grid-cols-3 gap-3">
            {tiers.map((tier, i) => (
              <li key={tier.label}>
                <button
                  type="button"
                  onClick={() => add(i)}
                  disabled={full}
                  className="patch flex min-h-32 w-full flex-col items-center justify-end gap-1 px-2 pb-3 pt-2 text-center transition-transform hover:-translate-y-1 active:translate-y-0 active:scale-95 disabled:opacity-50"
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
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-patch bg-card px-5 py-4" aria-live="polite">
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
                  <Kancing size={30} className="text-thread [--kancing-hole:#2a1b00]" />
                  {total}
                  <span className="text-xl font-bold">poin</span>
                </motion.p>
              </AnimatePresence>
            </div>
            <Button variant="ghost" size="sm" disabled={dropped.length === 0} onClick={() => setDropped([])}>
              Kosongkan
            </Button>
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            Di tempat sampah asli, poin ini muncul di aplikasimu dan hangus bila tidak diklaim dalam {expiryMinutes} menit.
          </p>
        </div>
      </div>
    </section>
  );
}
