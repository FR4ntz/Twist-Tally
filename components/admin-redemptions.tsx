"use client";

import { useMemo, useState } from "react";
import { ActionError, setRedemptionStatus } from "@/lib/actions";
import { formatDateTime, groupCode } from "@/lib/format";
import { useCollection } from "@/lib/hooks";
import type { Redemption, RedemptionStatus, WithId } from "@/lib/types";
import { toast } from "./providers";
import { StatusChip } from "./rows";
import { Button, ConfirmSheet, EmptyState, ErrorState, Field, LoadingBlock, PageTitle, Points, Tabs } from "./ui";

type Filter = "proses" | "selesai" | "batal" | "semua";

const filters: Record<Filter, (r: Redemption) => boolean> = {
  proses: (r) => r.status === "baru" || r.status === "siap",
  selesai: (r) => r.status === "selesai",
  batal: (r) => r.status === "dibatalkan",
  semua: () => true,
};

export function AdminRedemptions() {
  const redemptions = useCollection<Redemption>({ path: "redemptions", orderBy: ["createdAt", "desc"], limit: 300 });
  const [filter, setFilter] = useState<Filter>("proses");
  const [search, setSearch] = useState("");
  const [cancelling, setCancelling] = useState<WithId<Redemption> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/-/g, "");
    return (redemptions.data ?? []).filter(
      (r) =>
        filters[filter](r) &&
        (!term || r.code.toLowerCase().includes(term) || r.userName.toLowerCase().includes(term) || r.rewardName.toLowerCase().includes(term)),
    );
  }, [redemptions.data, filter, search]);

  const waiting = (redemptions.data ?? []).filter(filters.proses).length;

  async function move(r: WithId<Redemption>, status: RedemptionStatus) {
    setBusyId(r.id);
    try {
      await setRedemptionStatus(r, status);
      toast.ok(
        status === "siap"
          ? "Ditandai siap diambil."
          : status === "selesai"
            ? "Hadiah ditandai sudah diambil."
            : "Penukaran dibatalkan dan poin dikembalikan.",
      );
      setCancelling(null);
    } catch (error) {
      toast.error(error instanceof ActionError ? error.message : "Status belum berubah. Coba lagi sebentar lagi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageTitle title="Penukaran">Verifikasi kode voucher pengguna, lalu serahkan hadiahnya.</PageTitle>

      <div className="mb-4 grid gap-3">
        <Tabs
          label="Status penukaran"
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: "proses", label: waiting > 0 ? `Perlu diproses (${waiting})` : "Perlu diproses" },
            { id: "selesai", label: "Selesai" },
            { id: "batal", label: "Dibatalkan" },
            { id: "semua", label: "Semua" },
          ]}
        />
        <Field
          label="Cari kode voucher, nama pengguna, atau hadiah"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div role="tabpanel" id={`panel-${filter}`} aria-labelledby={`tab-${filter}`}>
        {redemptions.loading ? (
          <LoadingBlock label="Memuat penukaran..." />
        ) : redemptions.error ? (
          <ErrorState title="Penukaran belum bisa dimuat">Periksa koneksi internet, lalu muat ulang halaman.</ErrorState>
        ) : list.length === 0 ? (
          <EmptyState title={search ? "Tidak ada yang cocok" : "Tidak ada penukaran di tab ini"}>
            {search
              ? "Periksa ejaan kode atau nama, atau pindah ke tab Semua."
              : "Penukaran baru dari pengguna muncul di sini begitu mereka menukar poin."}
          </EmptyState>
        ) : (
          <ul className="grid gap-3">
            {list.map((r) => (
              <li key={r.id} className="patch grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-2xl font-black leading-tight">{r.rewardName}</p>
                    <StatusChip status={r.status} />
                  </div>
                  <p className="text-sm text-ink-soft">
                    {r.userName} · {formatDateTime(r.createdAt)} ·{" "}
                    <span className="font-mono font-bold tracking-wider text-ink">{groupCode(r.code)}</span>
                  </p>
                  <Points value={r.cost} size={16} className="mt-1 text-sm" />
                </div>
                {(r.status === "baru" || r.status === "siap") && (
                  <div className="flex flex-wrap gap-2">
                    {r.status === "baru" ? (
                      <Button size="sm" loading={busyId === r.id} onClick={() => move(r, "siap")}>
                        Tandai siap diambil
                      </Button>
                    ) : (
                      <Button size="sm" variant="thread" loading={busyId === r.id} onClick={() => move(r, "selesai")}>
                        Tandai sudah diambil
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setCancelling(r)}>
                      Batalkan
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmSheet
        open={cancelling !== null}
        title="Batalkan penukaran?"
        body={
          <p>
            {cancelling?.rewardName} untuk {cancelling?.userName} dibatalkan. {cancelling?.cost} poin dikembalikan ke
            saldo pengguna dan stok hadiah bertambah satu.
          </p>
        }
        confirmLabel="Batalkan dan kembalikan poin"
        danger
        busy={busyId !== null}
        onConfirm={() => cancelling && move(cancelling, "dibatalkan")}
        onClose={() => setCancelling(null)}
      />
    </div>
  );
}
