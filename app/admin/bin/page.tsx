import type { Metadata } from "next";
import { AdminBins } from "@/components/admin-bins";

export const metadata: Metadata = { title: "Tempat sampah | Panel admin" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function Page() {
  return <AdminBins />;
}
