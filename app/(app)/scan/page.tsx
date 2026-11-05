import type { Metadata } from "next";
import { ScanView } from "@/components/scan-view";

export const metadata: Metadata = { title: "Scan QR | Twist & Tally" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function ScanPage() {
  return <ScanView />;
}
