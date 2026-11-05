import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { LoadingBlock } from "@/components/ui";

export const metadata: Metadata = { title: "Masuk | Twist & Tally" };

export default function MasukPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center">
          <LoadingBlock label="Menyiapkan formulir..." />
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
