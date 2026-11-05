"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { extractDepositCode } from "@/lib/format";
import { QrScanner } from "./qr-scanner";
import { Button, Field, PageTitle } from "./ui";

export function ScanView() {
  const router = useRouter();
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open(text: string, source: "kamera" | "manual") {
    const code = extractDepositCode(text);
    if (!code) {
      setError(
        source === "kamera"
          ? "QR yang terbaca bukan kode setoran Twist & Tally. Arahkan kamera ke QR di layar tempat sampah."
          : "Kode harus 12 karakter huruf dan angka, contoh: AB3D-EF5G-HJ7K",
      );
      return;
    }
    router.push(`/klaim?kode=${code}`);
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    setError(null);
    open(manual, "manual");
  }

  return (
    <div className="mx-auto max-w-md">
      <PageTitle title="Scan QR">Arahkan kamera ke kode QR yang muncul di layar tempat sampah setelah botolmu terhitung.</PageTitle>

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
          label="Atau tulis kode setoran"
          hint="Kode tercetak di bawah QR pada layar tempat sampah."
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="AB3D-EF5G-HJ7K"
          className="font-mono tracking-widest"
        />
        <Button type="submit" variant="primary" disabled={manual.trim().length === 0}>
          Cek kode
        </Button>
      </form>
    </div>
  );
}
