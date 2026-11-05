import type { Metadata } from "next";
import { AdminSimulator } from "@/components/admin-simulator";

export const metadata: Metadata = { title: "Simulator sensor | Panel admin" };

// Isi halaman ini bergantung pada sesi login di browser, jadi navigasi ke sini memang menunggu status akun.
export const instant = false;

export default function Page() {
  return <AdminSimulator />;
}
