import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin-overview";

export const metadata: Metadata = { title: "Ringkasan | Panel admin" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function Page() {
  return <AdminOverview />;
}
