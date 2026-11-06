import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnectView } from "@/components/connect-view";
import { LoadingBlock } from "@/components/ui";

export const metadata: Metadata = { title: "Hubungkan ke tempat sampah | Twist & Tally" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function HubungPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Mencari tempat sampah..." />}>
      <ConnectView />
    </Suspense>
  );
}
