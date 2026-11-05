"use client";

import Link from "next/link";
import { fillPercent, formatDateTime, formatNumber } from "@/lib/format";
import { useCollection } from "@/lib/hooks";
import type { Bin, Deposit, Redemption, UserDoc } from "@/lib/types";
import { Chip, EmptyState, ErrorState, LoadingBlock, PageTitle, Points } from "./ui";

export function AdminOverview() {
  const bins = useCollection<Bin>({ path: "bins" });
  const users = useCollection<UserDoc>({ path: "users", orderBy: ["lifetimePoints", "desc"], limit: 500 });
  const redemptions = useCollection<Redemption>({ path: "redemptions", orderBy: ["createdAt", "desc"], limit: 200 });
  const deposits = useCollection<Deposit>({ path: "deposits", orderBy: ["createdAt", "desc"], limit: 8 });

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
  const pointsGiven = (users.data ?? []).reduce((sum, u) => sum + u.lifetimePoints, 0);
  const tasks = full.length + (pending.length > 0 ? 1 : 0);

  return (
    <div className="grid gap-8">
      <PageTitle title="Ringkasan" />

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
                <Link href="/admin/bin" className="patch patch-linen flex min-h-20 items-center justify-between gap-3 p-4 hover:-translate-y-0.5">
                  <span>
                    <span className="block font-display text-2xl font-black leading-tight">{bin.name} perlu dikosongkan</span>
                    <span className="block text-sm text-ink-soft">
                      Terisi {fillPercent(bin.bottleCount, bin.capacityBottles)}% ({bin.bottleCount} dari {bin.capacityBottles} botol)
                    </span>
                  </span>
                  <Chip tone="thread">Kosongkan</Chip>
                </Link>
              </li>
            ))}
            {pending.length > 0 && (
              <li>
                <Link href="/admin/penukaran" className="patch patch-linen flex min-h-20 items-center justify-between gap-3 p-4 hover:-translate-y-0.5">
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

      <section aria-labelledby="botol" className="patch patch-denim p-6 sm:p-8">
        <h2 id="botol" className="text-xl font-bold">
          Botol terkumpul di semua tempat sampah
        </h2>
        <p className="font-display text-[4.5rem] font-black leading-none sm:text-[6rem]">{formatNumber(totalBottles)}</p>
        <p className="mt-3 max-w-xl text-on-fill/90">
          {formatNumber(users.data?.length ?? 0)} pengguna terdaftar, {formatNumber(pointsGiven)} poin sudah dibagikan,{" "}
          {formatNumber(done)} penukaran selesai diserahkan.
        </p>
      </section>

      <section aria-labelledby="setoran" className="grid gap-3">
        <h2 id="setoran" className="text-3xl">
          Setoran terbaru
        </h2>
        {deposits.data && deposits.data.length > 0 ? (
          <ul className="divide-y-2 divide-dashed divide-stitch rounded-patch border-2 border-dashed border-stitch px-4">
            {deposits.data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                <span>
                  <span className="block font-bold">
                    {d.bottleCount} botol di {d.binName}
                  </span>
                  <span className="block text-sm text-ink-soft">{formatDateTime(d.createdAt)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <Points value={d.points} />
                  <Chip tone={d.status === "claimed" ? "denim" : d.status === "pending" ? "thread" : "plain"}>
                    {d.status === "claimed" ? "Diklaim" : d.status === "pending" ? "Menunggu klaim" : "Kedaluwarsa"}
                  </Chip>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Belum ada setoran">
            Setoran muncul setelah sensor mengirim hasil. Untuk mencoba alurnya, buka Simulator sensor.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
