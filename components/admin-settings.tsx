"use client";

import { useState, type FormEvent } from "react";
import { saveSettings } from "@/lib/actions";
import { useDoc } from "@/lib/hooks";
import { sortTiers, withDefaults } from "@/lib/points";
import type { PointsSettings } from "@/lib/types";
import { toast } from "./providers";
import { Button, ErrorState, Field, LoadingBlock, PageTitle } from "./ui";

type Row = { label: string; upToCm: string; points: string };

function toRows(settings: PointsSettings): Row[] {
  return sortTiers(settings.tiers).map((t) => ({
    label: t.label,
    upToCm: t.upToCm === null ? "" : String(t.upToCm),
    points: String(t.points),
  }));
}

export function AdminSettings() {
  const doc = useDoc<PointsSettings>("settings/points");
  if (doc.loading) return <LoadingBlock label="Memuat aturan poin..." />;
  if (doc.error) return <ErrorState title="Aturan poin belum bisa dimuat">Periksa koneksi internet, lalu muat ulang halaman.</ErrorState>;
  return <Editor initial={withDefaults(doc.data)} />;
}

function Editor({ initial }: { initial: PointsSettings }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const [expiry, setExpiry] = useState(String(initial.depositExpiryMinutes));
  const [session, setSession] = useState(String(initial.sessionExpiryMinutes));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (i: number, patch: Partial<Row>) => setRows((list) => list.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const tiers = rows.map((r, i) => ({
      label: r.label.trim(),
      upToCm: i === rows.length - 1 ? null : Number(r.upToCm),
      points: Number(r.points),
    }));
    const minutes = Number(expiry);
    const sessionMinutes = Number(session);

    if (tiers.some((t) => !t.label)) return setError("Setiap tier perlu nama, contoh: Kecil.");
    if (tiers.some((t) => !Number.isInteger(t.points) || t.points < 0)) return setError("Poin tiap botol harus bilangan bulat 0 atau lebih.");
    const limits = tiers.slice(0, -1).map((t) => t.upToCm as number);
    if (limits.some((n) => !Number.isFinite(n) || n <= 0)) return setError("Batas tinggi tier harus angka lebih dari 0.");
    if (limits.some((n, i) => i > 0 && n <= limits[i - 1])) return setError("Batas tinggi harus naik dari tier ke tier.");
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) return setError("Batas klaim poin antara 1 dan 120 menit.");
    if (!Number.isInteger(sessionMinutes) || sessionMinutes < 1 || sessionMinutes > 60) {
      return setError("Masa sambungan akun ke tempat sampah antara 1 dan 60 menit.");
    }

    setError(null);
    setBusy(true);
    try {
      await saveSettings({ tiers, depositExpiryMinutes: minutes, sessionExpiryMinutes: sessionMinutes });
      toast.ok("Aturan poin disimpan. Setoran berikutnya memakai aturan ini.");
    } catch {
      toast.error("Aturan belum tersimpan. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageTitle title="Aturan poin">
        Sensor membaca tinggi tiap botol. Tinggi menentukan tier, dan tier menentukan poinnya. Perubahan hanya berlaku untuk
        setoran baru.
      </PageTitle>
      <form onSubmit={submit} noValidate className="grid gap-5">
        <ul className="grid gap-3">
          {rows.map((row, i) => {
            const last = i === rows.length - 1;
            return (
              <li key={i} className="patch grid gap-3 p-4 sm:grid-cols-3">
                <Field label="Nama tier" value={row.label} onChange={(e) => update(i, { label: e.target.value })} />
                {last ? (
                  <Field
                    label="Batas tinggi (cm)"
                    value={`di atas ${Number(rows[i - 1]?.upToCm) || 0} cm`}
                    readOnly
                    hint="Tier terakhir tanpa batas atas."
                  />
                ) : (
                  <Field
                    label="Sampai tinggi (cm)"
                    type="number"
                    inputMode="decimal"
                    value={row.upToCm}
                    onChange={(e) => update(i, { upToCm: e.target.value })}
                  />
                )}
                <Field
                  label="Poin per botol"
                  type="number"
                  inputMode="numeric"
                  value={row.points}
                  onChange={(e) => update(i, { points: e.target.value })}
                />
              </li>
            );
          })}
        </ul>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Batas klaim poin (menit)"
            type="number"
            inputMode="numeric"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            hint="Poin dari sensor hangus bila tidak diklaim dalam waktu ini."
          />
          <Field
            label="Masa sambungan akun (menit)"
            type="number"
            inputMode="numeric"
            value={session}
            onChange={(e) => setSession(e.target.value)}
            hint="Setelah scan QR tempat sampah, akun tersambung selama waktu ini."
          />
        </div>
        {error && (
          <p role="alert" className="rounded-[10px] border-2 border-danger bg-danger-soft px-3.5 py-2.5 text-sm font-bold">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" variant="thread" loading={busy}>
            Simpan aturan poin
          </Button>
        </div>
      </form>
    </div>
  );
}
