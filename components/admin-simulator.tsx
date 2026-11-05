"use client";

import Link from "next/link";
import { useState } from "react";
import { createDeposit } from "@/lib/actions";
import { fillPercent, groupCode } from "@/lib/format";
import { useCollection, useDoc } from "@/lib/hooks";
import { DEFAULT_SETTINGS, readBottle, sampleHeight, sortTiers, sumPoints } from "@/lib/points";
import type { Bin, PointsSettings } from "@/lib/types";
import { Icon } from "./icons";
import { toast } from "./providers";
import { Button, EmptyState, ErrorState, Field, LinkButton, LoadingBlock, PageTitle, Points, SelectField } from "./ui";

export function AdminSimulator() {
  const bins = useCollection<Bin>({ path: "bins" });
  const settingsDoc = useDoc<PointsSettings>("settings/points");
  const settings = settingsDoc.data ?? DEFAULT_SETTINGS;
  const tiers = sortTiers(settings.tiers);

  const [binId, setBinId] = useState("");
  const [heights, setHeights] = useState<number[]>([]);
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ code: string; binId: string; points: number; count: number } | null>(null);

  if (bins.loading || settingsDoc.loading) return <LoadingBlock label="Menyiapkan simulator..." />;
  if (bins.error) return <ErrorState title="Simulator belum bisa dibuka">Periksa koneksi internet, lalu muat ulang halaman.</ErrorState>;
  if (!bins.data || bins.data.length === 0) {
    return (
      <div>
        <PageTitle title="Simulator sensor" />
        <EmptyState
          title="Belum ada tempat sampah"
          action={<LinkButton href="/admin/bin" variant="thread">Daftarkan tempat sampah</LinkButton>}
        >
          Simulator mengirim hasil bacaan sensor ke sebuah tempat sampah, jadi tempat sampahnya harus ada dulu.
        </EmptyState>
      </div>
    );
  }

  const bin = bins.data.find((b) => b.id === binId) ?? bins.data[0];
  const bottles = heights.map((h) => readBottle(h, tiers));
  const total = sumPoints(bottles);

  function addCustom() {
    const value = Number(custom);
    if (!Number.isFinite(value) || value < 5 || value > 60) {
      setCustomError("Isi tinggi antara 5 dan 60 cm.");
      return;
    }
    setCustomError(null);
    setHeights((list) => [...list, Math.round(value * 10) / 10]);
    setCustom("");
  }

  async function send() {
    setBusy(true);
    try {
      const result = await createDeposit(bin, heights, settings);
      setSent({ code: result.code, binId: bin.id, points: result.points, count: result.bottles.length });
      setHeights([]);
      toast.ok("Hasil sensor terkirim. Kode QR tampil di layar tempat sampah.");
    } catch {
      toast.error("Hasil sensor gagal dikirim. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageTitle title="Simulator sensor">
        Meniru sensor ultrasonik di tempat sampah: tambahkan botol dengan tinggi tertentu, lalu kirim. Kode QR muncul di
        layar tempat sampah, dan pengguna bisa mengklaimnya lewat menu Scan.
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="patch grid content-start gap-5 p-5" aria-labelledby="sim-input">
          <h2 id="sim-input" className="text-2xl">
            Botol yang masuk
          </h2>
          <SelectField label="Tempat sampah" value={bin.id} onChange={(e) => setBinId(e.target.value)}>
            {bins.data.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({fillPercent(b.bottleCount, b.capacityBottles)}% terisi)
              </option>
            ))}
          </SelectField>

          <div>
            <p className="mb-2 text-sm font-bold">Tambah botol cepat</p>
            <div className="flex flex-wrap gap-2">
              {tiers.map((tier, i) => {
                const h = sampleHeight(tiers, i);
                return (
                  <Button key={tier.label} variant="ghost" size="sm" onClick={() => setHeights((list) => [...list, h])}>
                    <Icon name="plus" size={16} />
                    {tier.label}, {h} cm
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Field
                label="Atau isi tinggi sendiri (cm)"
                type="number"
                inputMode="decimal"
                min={5}
                max={60}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                error={customError}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
              />
            </div>
            <Button variant="ghost" onClick={addCustom} className="mt-[1.65rem]">
              Tambah
            </Button>
          </div>
        </section>

        <section className="patch patch-linen grid content-start gap-4 p-5" aria-labelledby="sim-result">
          <h2 id="sim-result" className="text-2xl">
            Hasil bacaan
          </h2>
          {bottles.length === 0 ? (
            <p className="text-ink-soft">Belum ada botol. Tambahkan botol dari panel di samping.</p>
          ) : (
            <ul className="divide-y-2 divide-dashed divide-stitch">
              {bottles.map((b, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    Botol {i + 1}: {b.heightCm} cm, {b.tier.toLowerCase()}
                  </span>
                  <span className="flex items-center gap-2">
                    <Points value={b.points} size={16} />
                    <button
                      type="button"
                      aria-label={`Hapus botol ${i + 1}`}
                      onClick={() => setHeights((list) => list.filter((_, idx) => idx !== i))}
                      className="grid size-11 place-items-center rounded-full hover:bg-paper"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between border-t-2 border-stitch pt-3">
            <span className="font-bold">{bottles.length} botol</span>
            <Points value={total} size={24} className="text-3xl" />
          </div>
          <Button variant="thread" loading={busy} disabled={bottles.length === 0} onClick={send} className="min-h-14 text-lg">
            Kirim hasil sensor
          </Button>
        </section>
      </div>

      {sent && (
        <section className="patch patch-denim grid gap-3 p-5" aria-live="polite">
          <h2 className="text-3xl">Setoran terkirim</h2>
          <p>
            {sent.count} botol, {sent.points} poin. Kode klaim:{" "}
            <span className="font-mono text-xl font-bold tracking-[0.12em]">{groupCode(sent.code)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/bin?id=${sent.binId}`} variant="thread" size="sm">
              Buka layar tempat sampah
            </LinkButton>
            <Link
              href={`/klaim?kode=${sent.code}`}
              className="inline-flex min-h-11 items-center justify-center rounded-[12px] border-2 border-on-fill px-4 text-sm font-bold text-on-fill"
            >
              Coba klaim di akun ini
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
