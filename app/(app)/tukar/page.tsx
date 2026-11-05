import type { Metadata } from "next";
import { RewardsView } from "@/components/rewards-view";

export const metadata: Metadata = { title: "Tukar poin | Twist & Tally" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function TukarPage() {
  return <RewardsView />;
}
