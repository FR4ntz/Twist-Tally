"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime, groupCode } from "@/lib/format";
import { useCollection } from "@/lib/hooks";
import type { LedgerEntry, Redemption, WithId } from "@/lib/types";
import { Icon } from "./icons";
import { LedgerRow, StatusChip, VoucherSheet } from "./rows";
import { EmptyState, ErrorState, LinkButton, LoadingBlock, PageTitle, Points, Tabs } from "./ui";

type Tab = "poin" | "voucher";

export function HistoryView() {
  const { profile } = useAuth();
  const uid = profile?.id ?? null;
  const [tab, setTab] = useState<Tab>("poin");
  const [open, setOpen] = useState<WithId<Redemption> | null>(null);

  const ledger = useCollection<LedgerEntry>(
    uid ? { path: `users/${uid}/ledger`, orderBy: ["createdAt", "desc"], limit: 100 } : null,
  );
  const redemptions = useCollection<Redemption>(uid ? { path: "redemptions", where: [["uid", "==", uid]] } : null);

  const vouchers = [...(redemptions.data ?? [])].sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );

  return (
    <div>
      <PageTitle title="Riwayat" />
      <Tabs
        label="Jenis riwayat"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "poin", label: "Poin masuk dan keluar" },
          { id: "voucher", label: "Voucher" },
        ]}
      />

      <div className="mt-5" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "poin" &&
          (ledger.loading ? (
            <LoadingBlock label="Memuat riwayat poin..." />
          ) : ledger.error ? (
            <ErrorState title="Riwayat poin belum bisa dimuat">Periksa koneksi internetmu, lalu buka ulang halaman ini.</ErrorState>
          ) : ledger.data && ledger.data.length > 0 ? (
            <ul className="receipt divide-y-2 divide-dashed divide-stitch px-5 pb-9 pt-2">
              {ledger.data.map((entry) => (
                <LedgerRow key={entry.id} entry={entry} />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Belum ada poin yang tercatat"
              action={
                <LinkButton href="/scan" size="sm">
                  Scan QR tempat sampah
                </LinkButton>
              }
            >
              Setoran dan penukaran poin akan tampil di sini, urut dari yang terbaru.
            </EmptyState>
          ))}

        {tab === "voucher" &&
          (redemptions.loading ? (
            <LoadingBlock label="Memuat voucher..." />
          ) : redemptions.error ? (
            <ErrorState title="Voucher belum bisa dimuat">Periksa koneksi internetmu, lalu buka ulang halaman ini.</ErrorState>
          ) : vouchers.length > 0 ? (
            <ul className="grid gap-3">
              {vouchers.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(v)}
                    className="patch flex w-full items-center gap-4 p-4 text-left hover:-translate-y-0.5"
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-[10px] bg-paper-deep">
                      <Icon name="tag" size={24} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-2xl font-black leading-tight">{v.rewardName}</span>
                      <span className="block text-sm text-ink-soft">
                        {groupCode(v.code)} · {formatDateTime(v.createdAt)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusChip status={v.status} />
                      <Points value={v.cost} size={16} className="text-sm" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Belum ada voucher"
              action={
                <LinkButton href="/tukar" size="sm">
                  Lihat katalog hadiah
                </LinkButton>
              }
            >
              Voucher muncul di sini setelah kamu menukar poin dengan hadiah.
            </EmptyState>
          ))}
      </div>

      <VoucherSheet redemption={open ? (vouchers.find((v) => v.id === open.id) ?? open) : null} onClose={() => setOpen(null)} />
    </div>
  );
}
