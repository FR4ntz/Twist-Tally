import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { LoadingBlock } from "@/components/ui";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center">
          <LoadingBlock label="Membuka akunmu..." />
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
