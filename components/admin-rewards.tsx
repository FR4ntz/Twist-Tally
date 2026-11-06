"use client";

import { useState, type FormEvent } from "react";
import { deleteReward, saveReward, seedSampleRewards } from "@/lib/actions";
import { useCollection } from "@/lib/hooks";
import type { Reward, WithId } from "@/lib/types";
import { toast } from "./providers";
import { Button, Chip, ConfirmSheet, EmptyState, ErrorState, Field, LoadingBlock, PageTitle, Points, Sheet, Switch, TextArea } from "./ui";

type Draft = {
  id: string | null;
  name: string;
  description: string;
  category: string;
  pointsCost: string;
  stock: string;
  active: boolean;
  imageUrl: string;
};

const blank: Draft = { id: null, name: "", description: "", category: "", pointsCost: "", stock: "", active: true, imageUrl: "" };

export function AdminRewards() {
  const rewards = useCollection<Reward>({ path: "rewards", orderBy: ["pointsCost", "asc"], limit: 200 });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<WithId<Reward> | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  const open = (reward?: WithId<Reward>) => {
    setErrors({});
    setDraft(
      reward
        ? {
            id: reward.id,
            name: reward.name,
            description: reward.description,
            category: reward.category,
            pointsCost: String(reward.pointsCost),
            stock: String(reward.stock),
            active: reward.active,
            imageUrl: reward.imageUrl,
          }
        : blank,
    );
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const cost = Number(draft.pointsCost);
    const stock = Number(draft.stock);
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "Isi nama hadiah.";
    if (!draft.category.trim()) next.category = "Isi kategori, contoh: Merchandise.";
    if (!Number.isInteger(cost) || cost < 1) next.pointsCost = "Isi harga dalam poin, bilangan bulat minimal 1.";
    if (!Number.isInteger(stock) || stock < 0) next.stock = "Isi stok, bilangan bulat 0 atau lebih.";
    if (draft.imageUrl.trim() && !/^(https?:\/\/|\/)/.test(draft.imageUrl.trim())) next.imageUrl = "Alamat gambar diawali https:// atau / (untuk file di folder public).";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await saveReward(draft.id, {
        name: draft.name.trim(),
        description: draft.description.trim(),
        category: draft.category.trim(),
        pointsCost: cost,
        stock,
        active: draft.active,
        imageUrl: draft.imageUrl.trim(),
      });
      toast.ok(draft.id ? "Hadiah diperbarui." : "Hadiah ditambahkan.");
      setDraft(null);
    } catch {
      toast.error("Hadiah belum tersimpan. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await deleteReward(removing.id);
      toast.ok(`${removing.name} dihapus.`);
      setRemoving(null);
    } catch {
      toast.error("Gagal menghapus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function seed() {
    setBusy(true);
    try {
      await seedSampleRewards();
      toast.ok("Sepuluh hadiah contoh ditambahkan. Ubah atau hapus sesuai kebutuhan.");
    } catch {
      toast.error("Gagal menambahkan contoh. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const categories = Array.from(new Set((rewards.data ?? []).map((r) => r.category).filter(Boolean)));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-3">
        <PageTitle title="Hadiah" className="mb-4">Katalog yang tampil di halaman Tukar. Hadiah nonaktif atau stok 0 tidak bisa ditukar.</PageTitle>
        <Button variant="thread" onClick={() => open()}>
          Tambah hadiah
        </Button>
      </div>

      {rewards.loading ? (
        <LoadingBlock label="Memuat hadiah..." />
      ) : rewards.error ? (
        <ErrorState title="Hadiah belum bisa dimuat">Periksa koneksi internet, lalu muat ulang halaman.</ErrorState>
      ) : rewards.data && rewards.data.length > 0 ? (
        <ul className="grid gap-3">
          {rewards.data.map((r) => (
            <li key={r.id} className="patch flex flex-wrap items-center justify-between gap-3 p-4">
              {r.imageUrl && (
                // Alamat gambar diisi admin dan bisa dari host mana pun, jadi tidak lewat next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.imageUrl} alt="" width={96} height={60} className="aspect-[8/5] w-24 shrink-0 rounded-[8px] bg-paper-deep object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-2xl font-black leading-tight">{r.name}</p>
                  {r.isSample && <Chip>Contoh</Chip>}
                  {!r.active && <Chip tone="danger">Nonaktif</Chip>}
                </div>
                <p className="text-sm text-ink-soft">
                  {r.category} · stok {r.stock}
                </p>
              </div>
              <Points value={r.pointsCost} size={20} className="text-xl" />
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => open(r)}>
                  Ubah
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRemoving(r)}>
                  Hapus
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Katalog masih kosong"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="thread" onClick={() => open()}>
                Tambah hadiah pertama
              </Button>
              <Button variant="ghost" loading={busy} onClick={seed}>
                Isi sepuluh hadiah contoh
              </Button>
            </div>
          }
        >
          Pengguna belum punya apa-apa untuk ditukar. Tambah hadiah asli, atau isi contoh dulu untuk mencoba alurnya (contoh
          diberi label dan bisa dihapus).
        </EmptyState>
      )}

      <Sheet open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Ubah hadiah" : "Hadiah baru"}>
        {draft && (
          <form onSubmit={submit} noValidate className="grid gap-4">
            <Field label="Nama hadiah" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} error={errors.name} />
            <TextArea label="Deskripsi" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <div className="grid gap-1.5">
              <Field
                label="Kategori"
                list="kategori-hadiah"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                error={errors.category}
              />
              <datalist id="kategori-hadiah">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Harga (poin)"
                type="number"
                inputMode="numeric"
                min={1}
                value={draft.pointsCost}
                onChange={(e) => setDraft({ ...draft, pointsCost: e.target.value })}
                error={errors.pointsCost}
              />
              <Field
                label="Stok"
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.stock}
                onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                error={errors.stock}
              />
            </div>
            <Field
              label="Alamat gambar (opsional)"
              type="text"
              inputMode="url"
              value={draft.imageUrl}
              onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
              error={errors.imageUrl}
              hint="Tempel tautan https://... atau jalur file di folder public, contoh /rewards/tote-denim.svg. Kosongkan untuk kartu bertipografi."
            />
            <Switch checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="Tampil di katalog" />
            <Button type="submit" loading={busy}>
              {draft.id ? "Simpan perubahan" : "Tambah hadiah"}
            </Button>
          </form>
        )}
      </Sheet>

      <ConfirmSheet
        open={removing !== null}
        title="Hapus hadiah?"
        body={<p>{removing?.name} hilang dari katalog. Voucher yang sudah ditukar tetap berlaku.</p>}
        confirmLabel="Hapus hadiah"
        danger
        busy={busy}
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
