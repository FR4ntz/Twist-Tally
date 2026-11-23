import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";

export const metadata: Metadata = { title: "Dashboard | Twist & Tally" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini menunggu status akun.
export const instant = false;

export default function DashboardPage() {
  return <HomeView />;
}
