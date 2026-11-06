"use client";

import { QRCodeSVG } from "qrcode.react";
import { formatDateTime, groupCode } from "@/lib/format";
import type { LedgerEntry, Redemption, RedemptionStatus, WithId } from "@/lib/types";
import { Icon } from "./icons";
import { Chip, Points, Sheet } from "./ui";

export const statusLabel: Record<RedemptionStatus, string> = {
  baru: "Menunggu diproses",
  siap: "Siap diambil",
  selesai: "Sudah diambil",
  dibatalkan: "Dibatalkan",
};

export function StatusChip({ status }: { status: RedemptionStatus }) {
  const tone = status === "siap" ? "thread" : status === "selesai" ? "denim" : status === "dibatalkan" ? "danger" : "plain";
  return <Chip tone={tone}>{statusLabel[status]}</Chip>;
}

export function LedgerRow({ entry }: { entry: WithId<LedgerEntry> }) {
  const income = entry.points >= 0;
  const title =
    entry.type === "setor"
      ? `Setor ${entry.bottles ?? 0} botol`
      : entry.type === "tukar"
        ? `Tukar ${entry.rewardName ?? "hadiah"}`
        : entry.type === "bonus"
          ? "Bonus dari admin"
          : `Poin kembali: ${entry.rewardName ?? "hadiah"}`;
  const detail =
    entry.type === "setor" && entry.binName ? `${entry.binName}, ${formatDateTime(entry.createdAt)}` : formatDateTime(entry.createdAt);

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-paper-deep text-ink">
        <Icon name={entry.type === "setor" ? "bottle" : entry.type === "bonus" ? "plus" : "tag"} size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words font-bold leading-snug">{title}</p>
        <p className="break-words text-sm text-ink-soft">{detail}</p>
      </div>
      <p className="shrink-0 text-lg font-black tabular-nums">
        <span aria-hidden="true">{income ? "+" : "-"}</span>
        <span className="sr-only">{income ? "tambah " : "kurang "}</span>
        {Math.abs(entry.points)}
        <span className="sr-only"> poin</span>
      </p>
    </li>
  );
}

export function VoucherSheet({
  redemption,
  onClose,
}: {
  redemption: WithId<Redemption> | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={redemption !== null} onClose={onClose} title="Voucher penukaran">
      {redemption && (
        <div className="grid gap-4 text-center">
          <p className="font-display text-3xl font-black leading-tight">{redemption.rewardName}</p>
          <div className="mx-auto rounded-[14px] bg-white p-4">
            <QRCodeSVG value={redemption.code} size={176} level="M" title={`QR voucher ${redemption.code}`} />
          </div>
          <div>
            <p className="text-sm text-ink-soft">Kode voucher</p>
            <p className="font-mono text-3xl font-bold tracking-[0.12em]">{groupCode(redemption.code)}</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <StatusChip status={redemption.status} />
            <Points value={redemption.cost} />
          </div>
          <p className="text-sm text-ink-soft">
            {redemption.status === "dibatalkan"
              ? "Penukaran ini dibatalkan dan poinnya sudah kembali ke saldo."
              : redemption.status === "selesai"
                ? "Hadiah ini sudah kamu ambil."
                : "Tunjukkan kode ini ke admin untuk mengambil hadiahmu."}
          </p>
        </div>
      )}
    </Sheet>
  );
}
