"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ActionError, claimDeposit } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { extractDepositCode, groupCode } from "@/lib/format";
import { useDoc, useNow } from "@/lib/hooks";
import type { Deposit } from "@/lib/types";
import { CountUp } from "./home-view";
import { Kancing } from "./icons";
import { toast } from "./providers";
import { Button, ErrorState, LinkButton, LoadingBlock, PageTitle, Points } from "./ui";

export function ClaimView() {
  const params = useSearchParams();
  const code = extractDepositCode(params.get("kode") ?? "");
  const { user } = useAuth();
  const deposit = useDoc<Deposit>(code ? `deposits/${code}` : null);
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ points: number; bottles: number } | null>(null);

  if (!code) {
    return (
      <ErrorState title="Kode setoran tidak valid">
        Kode harus 12 karakter huruf dan angka. Scan ulang QR di layar tempat sampah, atau tulis kodenya manual.
      </ErrorState>
    );
  }

  if (done) return <ClaimSuccess points={done.points} bottles={done.bottles} />;

  if (deposit.loading) return <LoadingBlock label="Memeriksa kode setoran..." />;
  if (deposit.error) {
    return (
      <ErrorState title="Kode belum bisa diperiksa">
        Periksa koneksi internetmu, lalu buka ulang halaman ini.
      </ErrorState>
    );
  }

  const data = deposit.data;
  if (!data) {
    return (
      <div className="grid gap-4">
        <ErrorState title="Kode setoran tidak ditemukan">
          Pastikan kode {groupCode(code)} sama dengan yang tampil di layar tempat sampah.
        </ErrorState>
        <LinkButton href="/scan" variant="ghost">
          Scan ulang
        </LinkButton>
      </div>
    );
  }

  const msLeft = data.expiresAt.toMillis() - now;
  const expired = data.status === "expired" || (data.status === "pending" && msLeft <= 0);
  const mine = data.claimedBy === user?.uid;

  const groups = Object.values(
    data.bottles.reduce<Record<string, { tier: string; count: number; points: number }>>((acc, b) => {
      const row = acc[b.tier] ?? { tier: b.tier, count: 0, points: 0 };
      row.count += 1;
      row.points += b.points;
      acc[b.tier] = row;
      return acc;
    }, {}),
  );

  async function claim() {
    if (!user || !code) return;
    setBusy(true);
    try {
      setDone(await claimDeposit(user.uid, code));
    } catch (error) {
      toast.error(error instanceof ActionError ? error.message : "Klaim gagal. Coba lagi sebentar lagi.");
      setBusy(false);
    }
  }

  const minutes = Math.floor(Math.max(0, msLeft) / 60000);
  const seconds = Math.floor((Math.max(0, msLeft) % 60000) / 1000);

  return (
    <div className="mx-auto max-w-md">
      <PageTitle title="Setoran botol">Hasil pembacaan sensor di {data.binName}.</PageTitle>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className="receipt px-6 pb-10 pt-6"
      >
        <p className="text-sm text-ink-soft">Kode {groupCode(code)}</p>
        <ul className="mt-3 grid gap-2 border-y-2 border-dashed border-stitch py-4">
          {groups.map((g) => (
            <li key={g.tier} className="flex items-baseline justify-between gap-3">
              <span>
                {g.count} botol {g.tier.toLowerCase()}
              </span>
              <span className="font-bold">{g.points} poin</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-bold">Total {data.bottleCount} botol</span>
          <Points value={data.points} size={26} className="text-3xl" />
        </div>
      </motion.div>

      <div className="mt-6 grid gap-3">
        {data.status === "pending" && !expired && (
          <>
            <Button variant="thread" loading={busy} onClick={claim} className="min-h-14 text-lg">
              Klaim {data.points} poin
            </Button>
            <p className="text-center text-sm text-ink-soft" role="timer">
              Kode berlaku {minutes} menit {String(seconds).padStart(2, "0")} detik lagi.
            </p>
          </>
        )}
        {data.status === "claimed" && (
          <ErrorState title={mine ? "Setoran ini sudah kamu klaim" : "Setoran ini sudah diklaim pengguna lain"}>
            {mine
              ? "Poinnya sudah masuk ke saldomu. Cek riwayat untuk melihatnya."
              : "Satu kode hanya bisa diklaim satu kali. Scan QR dari setoranmu sendiri."}
          </ErrorState>
        )}
        {expired && data.status !== "claimed" && (
          <ErrorState title="Kode sudah kedaluwarsa">
            Kode setoran hanya berlaku beberapa menit. Setor botol lagi untuk mendapat kode baru.
          </ErrorState>
        )}
        <LinkButton href={data.status === "claimed" && mine ? "/riwayat" : "/beranda"} variant="ghost">
          {data.status === "claimed" && mine ? "Buka riwayat" : "Kembali ke beranda"}
        </LinkButton>
      </div>
    </div>
  );
}

function ClaimSuccess({ points, bottles }: { points: number; bottles: number }) {
  return (
    <div className="mx-auto grid max-w-md gap-6 text-center">
      <div className="patch patch-denim px-6 py-10">
        <motion.div
          initial={{ scale: 0, rotate: -120 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 12 }}
          className="mx-auto w-fit"
        >
          <Kancing size={84} className="text-thread [--kancing-hole:#2a5090]" />
        </motion.div>
        <h1 className="mt-4 text-4xl">Poin masuk</h1>
        <p className="mt-2 font-display text-[5rem] font-black leading-none" aria-live="polite">
          +<CountUp value={points} />
        </p>
        <p className="mt-3 text-on-fill/90">Dari {bottles} botol yang kamu setor.</p>
      </div>
      <div className="grid gap-3">
        <LinkButton href="/tukar" variant="thread">
          Tukar poinmu
        </LinkButton>
        <LinkButton href="/beranda" variant="ghost">
          Kembali ke beranda
        </LinkButton>
      </div>
    </div>
  );
}
