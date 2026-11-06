"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { deleteBin, emptyBin, liveSession, saveBin } from "@/lib/actions";
import { fillPercent, formatDateTime, formatNumber } from "@/lib/format";
import { useCollection, useNow } from "@/lib/hooks";
import type { Bin, Deposit, WithId } from "@/lib/types";
import { BinArt } from "./bin-art";
import { toast } from "./providers";
import {
  Button,
  Chip,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Field,
  FillGauge,
  LinkButton,
  LoadingBlock,
  PageTitle,
  Sheet,
} from "./ui";

type Draft = { id: string | null; name: string; location: string; capacity: string };

export function AdminBins() {
  const bins = useCollection<Bin>({ path: "bins" });
  const deposits = useCollection<Deposit>({ path: "deposits", orderBy: ["createdAt", "desc"], limit: 500 });
  const now = useNow(5000);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [emptying, setEmptying] = useState<WithId<Bin> | null>(null);
  const [removing, setRemoving] = useState<WithId<Bin> | null>(null);
  const [qrFor, setQrFor] = useState<WithId<Bin> | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; location?: string; capacity?: string }>({});

  const stats = useMemo(() => {
    const map = new Map<string, { claimed: number; expired: number; pending: number }>();
    for (const d of deposits.data ?? []) {
      const row = map.get(d.binId) ?? { claimed: 0, expired: 0, pending: 0 };
      const lapsed = d.status === "expired" || (d.status === "pending" && d.expiresAt.toMillis() <= now);
      if (d.status === "claimed") row.claimed += d.points;
      else if (lapsed) row.expired += d.points;
      else row.pending += d.points;
      map.set(d.binId, row);
    }
    return map;
  }, [deposits.data, now]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const capacity = Number(draft.capacity);
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "Beri nama tempat sampah, contoh: Bin Kantin Fakultas.";
    if (!draft.location.trim()) next.location = "Isi lokasi agar pengguna tahu letaknya.";
    if (!Number.isInteger(capacity) || capacity < 1) next.capacity = "Isi kapasitas dalam jumlah botol, minimal 1.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const id = await saveBin(
        draft.id,
        { name: draft.name.trim(), location: draft.location.trim(), capacityBottles: capacity },
        (bins.data ?? []).map((b) => b.id),
      );
      toast.ok(draft.id ? "Tempat sampah diperbarui." : `Tempat sampah ditambahkan dengan ID ${id}.`);
      setDraft(null);
    } catch {
      toast.error("Belum tersimpan. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function runEmpty() {
    if (!emptying) return;
    setBusy(true);
    try {
      await emptyBin(emptying.id);
      toast.ok(`${emptying.name} ditandai kosong.`);
      setEmptying(null);
    } catch {
      toast.error("Gagal menandai kosong. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function runRemove() {
    if (!removing) return;
    setBusy(true);
    try {
      await deleteBin(removing.id);
      toast.ok(`${removing.name} dihapus.`);
      setRemoving(null);
    } catch {
      toast.error("Gagal menghapus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const open = (bin?: WithId<Bin>) => {
    setErrors({});
    setDraft(
      bin
        ? { id: bin.id, name: bin.name, location: bin.location, capacity: String(bin.capacityBottles) }
        : { id: null, name: "", location: "", capacity: "100" },
    );
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-3">
        <PageTitle title="Tempat sampah" className="mb-4">
          Tiap tempat sampah punya ID unik (sampahId) yang tercetak di QR. Poin yang dibaca sensor dicatat per ID.
        </PageTitle>
        <Button variant="thread" onClick={() => open()}>
          Tambah tempat sampah
        </Button>
      </div>

      {bins.loading ? (
        <LoadingBlock label="Memuat tempat sampah..." />
      ) : bins.error ? (
        <ErrorState title="Daftar belum bisa dimuat">Periksa koneksi internet, lalu muat ulang halaman.</ErrorState>
      ) : bins.data && bins.data.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {bins.data.map((bin) => {
            const percent = fillPercent(bin.bottleCount, bin.capacityBottles);
            const session = liveSession(bin, now);
            const row = stats.get(bin.id) ?? { claimed: 0, expired: 0, pending: 0 };
            return (
              <li key={bin.id} className="patch patch-linen grid gap-4 p-5">
                <div className="flex items-start gap-4">
                  <BinArt percent={percent} className="w-20 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-display text-3xl font-black leading-tight">{bin.name}</p>
                      {percent >= 80 && <Chip tone="thread">Perlu dikosongkan</Chip>}
                    </div>
                    <p className="text-ink-soft">{bin.location}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Chip>ID {bin.id}</Chip>
                      {session ? <Chip tone="denim">Dipakai {session.userName}</Chip> : <Chip>Siap dipakai</Chip>}
                    </div>
                  </div>
                </div>
                <FillGauge percent={percent} label={`Isi ${bin.name}`} />

                <dl className="grid grid-cols-3 gap-2 rounded-[10px] bg-card p-3 text-center text-sm">
                  <div>
                    <dt className="text-ink-soft">Diterbitkan</dt>
                    <dd className="text-xl font-black tabular-nums">{formatNumber(bin.pointsIssued ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Diklaim</dt>
                    <dd className="text-xl font-black tabular-nums">{formatNumber(row.claimed)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Hangus</dt>
                    <dd className="text-xl font-black tabular-nums">{formatNumber(row.expired)}</dd>
                  </div>
                </dl>
                <p className="text-sm text-ink-soft">
                  Poin dalam satuan poin sensor. {bin.bottleCount} dari {bin.capacityBottles} botol sejak pengosongan terakhir (
                  {bin.lastEmptiedAt ? formatDateTime(bin.lastEmptiedAt) : "belum pernah dikosongkan"}).
                  {bin.lastReadingAt ? ` Bacaan sensor terakhir ${formatDateTime(bin.lastReadingAt)}.` : " Belum ada bacaan sensor."}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" onClick={() => setQrFor(bin)}>
                    QR dan ID
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEmptying(bin)} disabled={bin.bottleCount === 0}>
                    Kosongkan
                  </Button>
                  <LinkButton size="sm" variant="ghost" href={`/bin?id=${bin.id}`}>
                    Buka layar
                  </LinkButton>
                  <Button size="sm" variant="ghost" onClick={() => open(bin)}>
                    Ubah
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(bin)}>
                    Hapus
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title="Belum ada tempat sampah"
          action={
            <Button variant="thread" onClick={() => open()}>
              Tambah tempat sampah pertama
            </Button>
          }
        >
          Daftarkan tempat sampah dulu supaya QR, simulator sensor, dan layar tempat sampah bisa dipakai.{" "}
          <Link href="/admin/simulator" className="font-bold underline">
            Lihat simulator
          </Link>
        </EmptyState>
      )}

      <Sheet open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Ubah tempat sampah" : "Tempat sampah baru"}>
        {draft && (
          <form onSubmit={submit} noValidate className="grid gap-4">
            <Field label="Nama" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} error={errors.name} />
            <Field
              label="Lokasi"
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              error={errors.location}
              hint="Contoh: Lantai 1, dekat kantin."
            />
            <Field
              label="Kapasitas (jumlah botol)"
              type="number"
              inputMode="numeric"
              min={1}
              value={draft.capacity}
              onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
              error={errors.capacity}
            />
            {!draft.id && <p className="text-sm text-ink-soft">ID tempat sampah dibuat otomatis dan tidak bisa diubah setelahnya, karena tercetak di QR.</p>}
            <Button type="submit" loading={busy}>
              {draft.id ? "Simpan perubahan" : "Tambah tempat sampah"}
            </Button>
          </form>
        )}
      </Sheet>

      <Sheet open={qrFor !== null} onClose={() => setQrFor(null)} title="QR tempat sampah">
        {qrFor && (
          <div className="grid gap-4">
            <div className="print-area grid justify-items-center gap-3 text-center">
              <p className="font-display text-3xl font-black leading-tight">{qrFor.name}</p>
              <div className="rounded-[14px] bg-white p-4">
                <QRCodeSVG value={`${window.location.origin}/hubung?sampah=${qrFor.id}`} size={220} level="M" title={`QR ${qrFor.id}`} />
              </div>
              <p className="font-mono text-4xl font-bold tracking-[0.14em]">{qrFor.id}</p>
              <p className="max-w-xs text-sm text-ink-soft">
                Scan dengan menu Scan di aplikasi Twist &amp; Tally, atau ketik ID di atas.
              </p>
            </div>
            <Button variant="primary" onClick={() => window.print()}>
              Cetak QR
            </Button>
          </div>
        )}
      </Sheet>

      <ConfirmSheet
        open={emptying !== null}
        title="Kosongkan tempat sampah?"
        body={<p>Isi {emptying?.name} dicatat kembali ke 0 botol. Total sepanjang waktu tidak berubah.</p>}
        confirmLabel="Kosongkan"
        busy={busy}
        onConfirm={runEmpty}
        onClose={() => setEmptying(null)}
      />
      <ConfirmSheet
        open={removing !== null}
        title="Hapus tempat sampah?"
        body={<p>{removing?.name} dihapus dari daftar. QR yang sudah tercetak tidak akan berfungsi lagi. Riwayat setoran tetap tersimpan.</p>}
        confirmLabel="Hapus"
        danger
        busy={busy}
        onConfirm={runRemove}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
