import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";

export const metadata: Metadata = { title: "Beranda | Twist & Tally" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function BerandaPage() {
  return <HomeView />;
}
