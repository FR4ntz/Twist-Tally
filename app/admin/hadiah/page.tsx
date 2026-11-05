import type { Metadata } from "next";
import { AdminRewards } from "@/components/admin-rewards";

export const metadata: Metadata = { title: "Hadiah | Panel admin" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function Page() {
  return <AdminRewards />;
}
