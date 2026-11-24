"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { extractSampahId, extractTicketId } from "@/lib/format";
import { QrScanner } from "./qr-scanner";
import { PageTitle } from "./ui";

export function ScanView({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function open(text: string) {
    const ticketId = extractTicketId(text);
    if (ticketId) {
      if (navigator.vibrate) navigator.vibrate(40);
      router.push(`/hubung?tiket=${ticketId}`);
      return;
    }

    const sampahId = extractSampahId(text);
    if (!sampahId) {
      setError("QR yang terbaca bukan QR Twist & Tally. Arahkan kamera ke QR hasil deteksi botol di layar.");
      return;
    }
    let scannedTinggi: number | null = null;
    try {
      const raw = Number(new URL(text.trim()).searchParams.get("tinggi") ?? "");
      if (Number.isFinite(raw) && raw >= 3 && raw <= 60) {
        scannedTinggi = Math.round(raw * 10) / 10;
      }
    } catch {
      // Bukan URL lengkap
    }
    if (navigator.vibrate) navigator.vibrate(40);
    router.push(scannedTinggi !== null ? `/hubung?sampah=${sampahId}&tinggi=${scannedTinggi}` : `/hubung?sampah=${sampahId}`);
  }

  return (
    <div className="mx-auto grid max-w-md gap-5">
      <PageTitle as={embedded ? "h2" : "h1"} title="Scan QR Klaim Poin" className="mb-0">
        Arahkan kamera ke QR hasil deteksi ukuran botol untuk mengklaim poinmu sebelum QR hangus.
      </PageTitle>

      <QrScanner
        autoStart={!embedded}
        onText={(text) => {
          setError(null);
          open(text);
        }}
      />

      {error && (
        <p role="alert" className="rounded-[10px] border-2 border-danger bg-danger-soft px-3.5 py-2.5 text-sm font-bold">
          {error}
        </p>
      )}
    </div>
  );
}
