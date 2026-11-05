import type { Metadata } from "next";
import { Suspense } from "react";
import { ClaimView } from "@/components/claim-view";
import { LoadingBlock } from "@/components/ui";

export const metadata: Metadata = { title: "Klaim poin | Twist & Tally" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function KlaimPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Memeriksa kode setoran..." />}>
      <ClaimView />
    </Suspense>
  );
}
