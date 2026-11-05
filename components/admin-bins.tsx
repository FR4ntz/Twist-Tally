"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { deleteBin, emptyBin, saveBin } from "@/lib/actions";
import { fillPercent, formatDateTime, formatNumber } from "@/lib/format";
import { useCollection } from "@/lib/hooks";
import type { Bin, WithId } from "@/lib/types";
import { toast } from "./providers";
import { Button, Chip, ConfirmSheet, EmptyState, ErrorState, Field, FillGauge, LinkButton, LoadingBlock, PageTitle, Sheet } from "./ui";

type Draft = { id: string | null; name: string; location: string; capacity: string };

export function AdminBins() {
  const bins = useCollection<Bin>({ path: "bins" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [emptying, setEmptying] = useState<WithId<Bin> | null>(null);
  const [removing, setRemoving] = useState<WithId<Bin> | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; location?: string; capacity?: string }>({});

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
      await saveBin(draft.id, { name: draft.name.trim(), location: draft.location.trim(), capacityBottles: capacity });
      toast.ok(draft.id ? "Tempat sampah diperbarui." : "Tempat sampah ditambahkan.");
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle title="Tempat sampah">Daftar tempat sampah pintar dan isinya. Isi bertambah tiap sensor mengirim setoran.</PageTitle>
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
            return (
              <li key={bin.id} className="patch patch-linen grid gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-3xl font-black leading-tight">{bin.name}</p>
                    <p className="text-ink-soft">{bin.location}</p>
                  </div>
                  {percent >= 80 && <Chip tone="thread">Perlu dikosongkan</Chip>}
                </div>
                <FillGauge percent={percent} label={`Isi ${bin.name}`} />
                <p className="text-sm text-ink-soft">
                  {bin.bottleCount} dari {bin.capacityBottles} botol sejak pengosongan terakhir (
                  {bin.lastEmptiedAt ? formatDateTime(bin.lastEmptiedAt) : "belum pernah dikosongkan"}). Total sepanjang
                  waktu {formatNumber(bin.totalBottles)} botol.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" onClick={() => setEmptying(bin)} disabled={bin.bottleCount === 0}>
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
          Daftarkan tempat sampah dulu supaya simulator sensor dan layar QR bisa dipakai.{" "}
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
            <Button type="submit" loading={busy}>
              {draft.id ? "Simpan perubahan" : "Tambah tempat sampah"}
            </Button>
          </form>
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
        body={<p>{removing?.name} dihapus dari daftar. Riwayat setoran yang sudah ada tetap tersimpan.</p>}
        confirmLabel="Hapus"
        danger
        busy={busy}
        onConfirm={runRemove}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
