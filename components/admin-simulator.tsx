"use client";

import Link from "next/link";
import { useState } from "react";
import { createDeposit, liveSession } from "@/lib/actions";
import { fillPercent } from "@/lib/format";
import { useCollection, useDoc, useNow } from "@/lib/hooks";
import { readBottle, sampleHeight, sortTiers, sumPoints, withDefaults } from "@/lib/points";
import type { Bin, PointsSettings } from "@/lib/types";
import { BinArt } from "./bin-art";
import { Countdown } from "./countdown";
import { Icon } from "./icons";
import { toast } from "./providers";
import { Button, Chip, EmptyState, ErrorState, Field, LinkButton, LoadingBlock, PageTitle, Points, SelectField } from "./ui";

export function AdminSimulator() {
  const bins = useCollection<Bin>({ path: "bins" });
  const settingsDoc = useDoc<PointsSettings>("settings/points");
  const settings = withDefaults(settingsDoc.data);
  const tiers = sortTiers(settings.tiers);
  const now = useNow(1000);

  const [binId, setBinId] = useState("");
  const [heights, setHeights] = useState<number[]>([]);
  const [drop, setDrop] = useState<{ id: number } | null>(null);
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ binId: string; userName: string; points: number; count: number } | null>(null);

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
          Simulator mengirim hasil bacaan sensor atas nama ID sebuah tempat sampah, jadi tempat sampahnya harus ada dulu.
        </EmptyState>
      </div>
    );
  }

  const bin = bins.data.find((b) => b.id === binId) ?? bins.data[0];
  const session = liveSession(bin, now);
  const bottles = heights.map((h) => readBottle(h, tiers));
  const total = sumPoints(bottles);
  const percent = fillPercent(bin.bottleCount + heights.length, bin.capacityBottles);

  function addBottle(height: number) {
    setHeights((list) => [...list, height]);
    setDrop((d) => ({ id: (d?.id ?? 0) + 1 }));
  }

  function addCustom() {
    const value = Number(custom);
    if (!Number.isFinite(value) || value < 5 || value > 60) {
      setCustomError("Isi tinggi antara 5 dan 60 cm.");
      return;
    }
    setCustomError(null);
    addBottle(Math.round(value * 10) / 10);
    setCustom("");
  }

  async function send() {
    setBusy(true);
    try {
      const result = await createDeposit(bin, heights, settings);
      setSent({ binId: bin.id, userName: result.userName, points: result.points, count: result.bottles.length });
      setHeights([]);
      toast.ok(`Sensor mencatat ${result.points} poin untuk ${result.userName}. Menunggu klaim.`);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Hasil sensor gagal dikirim. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageTitle title="Simulator sensor" className="mb-0">
        Meniru sensor di tempat sampah. Pengguna scan QR tempat sampah lebih dulu agar tersambung, lalu sensor mencatat
        tinggi tiap botol atas nama userId dan sampahId.
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="patch grid content-start gap-5 p-5" aria-labelledby="sim-input">
          <h2 id="sim-input" className="text-2xl">
            Botol yang masuk
          </h2>
          <SelectField
            label="Tempat sampah (sampahId)"
            value={bin.id}
            onChange={(e) => {
              setBinId(e.target.value);
              setHeights([]);
              setSent(null);
            }}
          >
            {bins.data.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.id}
              </option>
            ))}
          </SelectField>

          <div
            className={`flex items-center justify-between gap-3 rounded-[12px] border-2 p-3 ${
              session ? "border-fill bg-denim-soft" : "border-dashed border-edge"
            }`}
          >
            {session ? (
              <>
                <div>
                  <Chip tone="denim">Tersambung</Chip>
                  <p className="mt-1 font-bold">{session.userName}</p>
                  <p className="text-sm text-ink-soft">Poin akan dicatat atas nama akun ini.</p>
                </div>
                <Countdown expiresAt={session.expiresAt} totalMs={settings.sessionExpiryMinutes * 60_000} size={56} label="Sisa waktu sambungan" />
              </>
            ) : (
              <div>
                <p className="font-bold">Belum ada pengguna tersambung</p>
                <p className="text-sm text-ink-soft">
                  Di aplikasi warga, scan QR atau buka{" "}
                  <Link href={`/hubung?sampah=${bin.id}`} className="font-bold underline">
                    /hubung?sampah={bin.id}
                  </Link>
                  , lalu tekan Hubungkan.
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Tambah botol cepat</p>
            <div className="grid grid-cols-3 gap-2">
              {tiers.map((tier, i) => {
                const h = sampleHeight(tiers, i);
                return (
                  <Button
                    key={tier.label}
                    variant="ghost"
                    size="sm"
                    aria-label={`${tier.label}, ${h} cm`}
                    className="min-h-14 flex-col gap-0 px-2 py-1.5"
                    onClick={() => addBottle(h)}
                  >
                    <span className="flex items-center gap-1">
                      <Icon name="plus" size={14} />
                      {tier.label}
                    </span>
                    <span className="text-xs font-normal text-ink-soft">{h} cm</span>
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
          <div className="flex items-start justify-between gap-3">
            <h2 id="sim-result" className="text-2xl">
              Hasil bacaan
            </h2>
            <BinArt percent={percent} drop={drop} className="-mt-1 w-28 shrink-0" />
          </div>
          {bottles.length === 0 ? (
            <p className="text-ink-soft">Belum ada botol. Tambahkan lewat tombol ukuran atau isi tinggi sendiri.</p>
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
          <Button variant="thread" loading={busy} disabled={bottles.length === 0 || !session} onClick={send} className="min-h-14 text-lg">
            Kirim hasil sensor
          </Button>
          {!session && bottles.length > 0 && (
            <p className="text-sm text-ink-soft">Tombol aktif setelah ada pengguna yang tersambung ke {bin.id}.</p>
          )}
        </section>
      </div>

      {sent && (
        <section className="patch patch-denim grid gap-3 p-5" aria-live="polite">
          <h2 className="text-3xl">Poin tercatat, menunggu klaim</h2>
          <p>
            {sent.count} botol, {sent.points} poin atas nama {sent.userName} di {sent.binId}. Poin hangus bila tidak
            diklaim dalam {settings.depositExpiryMinutes} menit.
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/bin?id=${sent.binId}`} variant="thread" size="sm">
              Buka layar tempat sampah
            </LinkButton>
          </div>
        </section>
      )}
    </div>
  );
}
