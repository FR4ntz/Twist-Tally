"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { extractSampahId } from "@/lib/format";
import { QrScanner } from "./qr-scanner";
import { Button, Field, PageTitle } from "./ui";

export function ScanView() {
  const router = useRouter();
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open(text: string, source: "kamera" | "manual") {
    const sampahId = extractSampahId(text);
    if (!sampahId) {
      setError(
        source === "kamera"
          ? "QR yang terbaca bukan QR tempat sampah Twist & Tally. Arahkan kamera ke QR yang tertempel di tempat sampah."
          : "ID tempat sampah berbentuk SB- diikuti 4 huruf atau angka, contoh: SB-7K3P",
      );
      return;
    }
    if (navigator.vibrate) navigator.vibrate(40);
    router.push(`/hubung?sampah=${sampahId}`);
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    setError(null);
    open(manual, "manual");
  }

  return (
    <div className="mx-auto max-w-md">
      <PageTitle title="Scan QR tempat sampah">
        QR di tempat sampah menghubungkan akunmu ke sensor, jadi poin dari botol yang kamu buang tercatat atas namamu.
      </PageTitle>

      <QrScanner
        onText={(text) => {
          setError(null);
          open(text, "kamera");
        }}
      />

      {error && (
        <p role="alert" className="mt-4 rounded-[10px] border-2 border-danger bg-danger-soft px-3.5 py-2.5 text-sm font-bold">
          {error}
        </p>
      )}

      <form onSubmit={submitManual} noValidate className="patch patch-linen mt-6 grid gap-3 p-5">
        <Field
          label="Atau tulis ID tempat sampah"
          hint="ID tercetak di bawah QR pada tempat sampah."
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="SB-7K3P"
          className="font-mono tracking-widest"
        />
        <Button type="submit" variant="primary" disabled={manual.trim().length === 0}>
          Cari tempat sampah
        </Button>
      </form>
    </div>
  );
}
