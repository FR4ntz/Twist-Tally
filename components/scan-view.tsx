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
    const sampahId = extractSampahId(text);
    if (sampahId) {
      if (navigator.vibrate) navigator.vibrate(40);
      router.push(`/hubung?sampah=${sampahId}`);
      return;
    }

    const ticketId = extractTicketId(text);
    if (ticketId) {
      if (navigator.vibrate) navigator.vibrate(40);
      router.push(`/hubung?tiket=${ticketId}`);
      return;
    }

    setError("QR yang terbaca bukan QR Twist & Tally. Arahkan kamera ke QR di layar Deteksi Botol.");
  }

  return (
    <div className="mx-auto grid max-w-md gap-5">
      <PageTitle as={embedded ? "h2" : "h1"} title="Scan QR Stasiun Botol" className="mb-0">
        Arahkan kamera ke QR di layar stasiun untuk menghubungkan akunmu, lalu setor dan klaim poin botolnya.
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
