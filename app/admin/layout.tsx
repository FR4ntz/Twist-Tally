import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { LoadingBlock } from "@/components/ui";

export const metadata: Metadata = { title: "Panel admin | Twist & Tally" };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center">
          <LoadingBlock label="Memeriksa akses admin..." />
        </div>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
