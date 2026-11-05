import type { Metadata } from "next";
import { Suspense } from "react";
import { BinScreen } from "@/components/bin-screen";
import { LoadingBlock } from "@/components/ui";

export const metadata: Metadata = { title: "Layar tempat sampah | Twist & Tally" };

export default function BinPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center">
          <LoadingBlock label="Menghubungkan ke tempat sampah..." />
        </div>
      }
    >
      <BinScreen />
    </Suspense>
  );
}
