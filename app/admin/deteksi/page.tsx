import type { Metadata } from "next";
import { AdminDeteksi } from "@/components/admin-deteksi";

export const metadata: Metadata = { title: "Deteksi ukuran botol | Admin Twist & Tally" };

// Isi halaman ini bergantung pada sesi login admin di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function AdminDeteksiPage() {
  return <AdminDeteksi />;
}
