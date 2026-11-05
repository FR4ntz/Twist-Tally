import type { Metadata } from "next";
import { AdminUsers } from "@/components/admin-users";

export const metadata: Metadata = { title: "Pengguna | Panel admin" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function Page() {
  return <AdminUsers />;
}
