import type { Metadata } from "next";
import { AdminRedemptions } from "@/components/admin-redemptions";

export const metadata: Metadata = { title: "Penukaran | Panel admin" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function Page() {
  return <AdminRedemptions />;
}
