import type { Metadata } from "next";
import { AdminSettings } from "@/components/admin-settings";

export const metadata: Metadata = { title: "Aturan poin | Panel admin" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function Page() {
  return <AdminSettings />;
}
