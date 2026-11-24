"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { liveSession } from "@/lib/actions";
import { fillPercent, formatDateTime, formatNumber } from "@/lib/format";
import { useCollection, useNow } from "@/lib/hooks";
import type { Bin, Deposit, Redemption, UserDoc } from "@/lib/types";
import { BottleTrio } from "./bottle-art";
import { Icon, type IconName } from "./icons";
import { Chip, EmptyState, ErrorState, FillGauge, LinkButton, LoadingBlock, PageTitle, Points, cn } from "./ui";

const SMOOTH_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function AdminOverview() {
  const bins = useCollection<Bin>({ path: "bins" });
  const users = useCollection<UserDoc>({ path: "users", orderBy: ["lifetimePoints", "desc"], limit: 500 });
  const redemptions = useCollection<Redemption>({ path: "redemptions", orderBy: ["createdAt", "desc"], limit: 200 });
  const deposits = useCollection<Deposit>({ path: "deposits", orderBy: ["createdAt", "desc"], limit: 500 });
  const now = useNow(10_000);

  const loading = bins.loading || users.loading || redemptions.loading || deposits.loading;
  const failed = bins.error || users.error || redemptions.error || deposits.error;

  if (loading) return <LoadingBlock label="Memuat ringkasan..." />;
  if (failed) {
    return (
      <ErrorState title="Ringkasan belum bisa dimuat">
        Periksa koneksi internet dan pastikan akun ini masih admin, lalu muat ulang halaman.
      </ErrorState>
    );
  }

  const binList = bins.data ?? [];
  const full = binList.filter((b) => fillPercent(b.bottleCount, b.capacityBottles) >= 80);
  const pending = (redemptions.data ?? []).filter((r) => r.status === "baru" || r.status === "siap");
  const done = (redemptions.data ?? []).filter((r) => r.status === "selesai").length;
  const totalBottles = binList.reduce((sum, b) => sum + b.totalBottles, 0);
  const issued = binList.reduce((sum, b) => sum + (b.pointsIssued ?? 0), 0);
  const allDeposits = deposits.data ?? [];
  const claimed = allDeposits.filter((d) => d.status === "claimed").reduce((sum, d) => sum + d.points, 0);
  const lapsed = allDeposits
    .filter((d) => d.status === "expired" || (d.status === "pending" && d.expiresAt.toMillis() <= now))
    .reduce((sum, d) => sum + d.points, 0);
  const tasks = full.length + (pending.length > 0 ? 1 : 0);

  const kpis: { label: string; value: string; hint: string; icon: IconName; tone: "denim" | "thread" | "plain" }[] = [
    {
      label: "Poin diklaim",
      value: formatNumber(claimed),
      hint: `Dari ${formatNumber(issued)} poin terbit`,
      icon: "tag",
      tone: "denim",
    },
    {
      label: "Penukaran aktif",
      value: formatNumber(pending.length),
      hint: `${formatNumber(done)} sudah diserahkan`,
      icon: "receipt",
      tone: pending.length > 0 ? "thread" : "plain",
    },
    {
      label: "Pengguna terdaftar",
      value: formatNumber(users.data?.length ?? 0),
      hint: "Akun aktif Twist & Tally",
      icon: "users",
      tone: "plain",
    },
    {
      label: "Poin hangus",
      value: formatNumber(lapsed),
      hint: "Melewati batas waktu klaim",
      icon: "clock",
      tone: "plain",
    },
  ];

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle title="Ringkasan" className="mb-0">
          Pantau tempat sampah pintar, poin terbit, dan penukaran hadiah secara langsung.
        </PageTitle>
        <LinkButton href="/admin/bin" variant="ghost" size="sm">
          <Icon name="bin" size={16} />
          Kelola tempat sampah
        </LinkButton>
      </div>

      {/* Hero: Statistik Total Botol Terkumpul */}
      <section aria-labelledby="botol">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: SMOOTH_EASE }}
          className="patch patch-denim relative overflow-hidden p-6 sm:p-8"
        >
          <div className="relative z-10 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Chip tone="thread">Total Dampak</Chip>
              <h2 id="botol" className="mt-3 text-lg font-bold text-on-fill/90">
                Botol plastik terkumpul di semua tempat sampah
              </h2>
              <p className="mt-1 font-display text-[4.5rem] font-black leading-none tabular-nums sm:text-[6rem]">
                {formatNumber(totalBottles)}
              </p>
              <p className="mt-3 max-w-xl text-sm text-on-fill/85 sm:text-base">
                {binList.length} unit tempat sampah aktif menerbitkan {formatNumber(issued)} poin bagi peserta.
              </p>
            </div>
            <div className="hidden sm:block">
              <BottleTrio scale={0.5} />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Grid KPI 4 kolom */}
      <section aria-label="Metrik ringkasan" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.05 * idx, ease: SMOOTH_EASE }}
            className="patch flex items-start justify-between gap-3 p-4"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{item.label}</p>
              <p className="mt-1 font-display text-4xl font-black leading-none tabular-nums">{item.value}</p>
              <p className="mt-2 text-xs text-ink-soft">{item.hint}</p>
            </div>
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-[10px]",
                item.tone === "denim"
                  ? "bg-denim-soft text-ink"
                  : item.tone === "thread"
                    ? "bg-thread text-thread-ink"
                    : "bg-paper-deep text-ink-soft",
              )}
            >
              <Icon name={item.icon} size={20} />
            </span>
          </motion.div>
        ))}
      </section>

      {/* Status Tempat Sampah Live */}
      {binList.length > 0 && (
        <section aria-labelledby="bins-live" className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="bins-live" className="text-3xl">
              Status tempat sampah
            </h2>
            <Link href="/admin/bin" className="text-sm font-bold text-denim underline">
              Lihat detail semua unit
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {binList.map((bin) => {
              const pct = fillPercent(bin.bottleCount, bin.capacityBottles);
              const session = liveSession(bin, now);
              return (
                <li key={bin.id}>
                  <Link
                    href="/admin/bin"
                    className="patch grid gap-3 p-4 transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-2xl font-black leading-tight">{bin.name}</p>
                        <p className="truncate text-xs text-ink-soft">
                          {bin.sampahId} · {bin.location}
                        </p>
                      </div>
                      <Chip tone={pct >= 80 ? "danger" : session ? "thread" : "denim"}>
                        {session ? session.userName : `${pct}%`}
                      </Chip>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs font-bold text-ink-soft">
                        <span>Isi saat ini</span>
                        <span className="tabular-nums">
                          {bin.bottleCount} / {bin.capacityBottles} botol
                        </span>
                      </div>
                      <FillGauge percent={pct} label={`Isi ${bin.name}`} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Tugas Mendesak */}
      <section aria-labelledby="tugas" className="grid gap-3">
        <h2 id="tugas" className="text-3xl">
          Perlu ditangani
        </h2>
        {tasks === 0 ? (
          <EmptyState title="Tidak ada yang mendesak">
            Semua tempat sampah masih di bawah 80% dan tidak ada penukaran yang menunggu.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {full.map((bin) => (
              <li key={bin.id}>
                <Link
                  href="/admin/bin"
                  className="patch patch-linen flex min-h-20 items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5"
                >
                  <span>
                    <span className="block font-display text-2xl font-black leading-tight">
                      {bin.name} perlu dikosongkan
                    </span>
                    <span className="block text-sm text-ink-soft">
                      Terisi {fillPercent(bin.bottleCount, bin.capacityBottles)}% ({bin.bottleCount} dari{" "}
                      {bin.capacityBottles} botol)
                    </span>
                  </span>
                  <Chip tone="thread">Kosongkan</Chip>
                </Link>
              </li>
            ))}
            {pending.length > 0 && (
              <li>
                <Link
                  href="/admin/penukaran"
                  className="patch patch-linen flex min-h-20 items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5"
                >
                  <span>
                    <span className="block font-display text-2xl font-black leading-tight">
                      {pending.length} penukaran menunggu
                    </span>
                    <span className="block text-sm text-ink-soft">Proses atau serahkan hadiahnya ke pengguna.</span>
                  </span>
                  <Chip tone="thread">Proses</Chip>
                </Link>
              </li>
            )}
          </ul>
        )}
      </section>

      {/* Setoran Terbaru */}
      <section aria-labelledby="setoran" className="grid gap-3">
        <h2 id="setoran" className="text-3xl">
          Setoran terbaru
        </h2>
        {allDeposits.length > 0 ? (
          <ul className="divide-y-2 divide-dashed divide-stitch rounded-patch border-2 border-dashed border-stitch bg-card px-4">
            {allDeposits.slice(0, 8).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                <span>
                  <span className="block font-bold">
                    {d.bottleCount} botol di {d.binName} ({d.binId}) untuk {d.userName ?? "Menunggu scan QR"}
                  </span>
                  <span className="block text-sm text-ink-soft">{formatDateTime(d.createdAt)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <Points value={d.points} />
                  {(() => {
                    const hangus = d.status === "expired" || (d.status === "pending" && d.expiresAt.toMillis() <= now);
                    return (
                      <Chip tone={d.status === "claimed" ? "denim" : hangus ? "danger" : "thread"}>
                        {d.status === "claimed" ? "Diklaim" : hangus ? "Hangus" : "Menunggu klaim"}
                      </Chip>
                    );
                  })()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Belum ada setoran">
            Setoran muncul setelah sensor mencatat botol di menu Deteksi botol dari pengguna yang tersambung.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
