"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ActionError, claimDeposit, expireDeposit } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { useCelebration } from "@/lib/celebrate";
import { useCollection, useNow } from "@/lib/hooks";
import type { Deposit, WithId } from "@/lib/types";
import { Burst } from "./burst";
import { Countdown } from "./countdown";
import { toast } from "./providers";
import { Button, Points } from "./ui";

export function useMyDeposits(uid: string | null) {
  return useCollection<Deposit>(uid ? { path: "deposits", where: [["userId", "==", uid]], limit: 100 } : null);
}

export function totalMs(deposit: Deposit): number {
  return Math.max(1, deposit.expiresAt.toMillis() - (deposit.createdAt?.toMillis() ?? deposit.expiresAt.toMillis() - 180_000));
}

function useClaim(deposit: WithId<Deposit>) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  async function claim() {
    if (!user) return;
    setBusy(true);
    try {
      const result = await claimDeposit(user.uid, deposit.id);
      useCelebration.getState().fire(`+${result.points}`, `poin masuk dari ${deposit.binName}`);
    } catch (error) {
      toast.error(error instanceof ActionError ? error.message : "Klaim gagal. Coba lagi sebentar lagi.");
      setBusy(false);
    }
  }
  return { busy, claim };
}

/** Kartu setoran yang menunggu klaim: rincian botol, hitung mundur, dan tombol klaim. */
export function ClaimCard({ deposit }: { deposit: WithId<Deposit> }) {
  const { busy, claim } = useClaim(deposit);
  const groups = Object.values(
    deposit.bottles.reduce<Record<string, { tier: string; count: number; points: number }>>((acc, b) => {
      const row = acc[b.tier] ?? { tier: b.tier, count: 0, points: 0 };
      row.count += 1;
      row.points += b.points;
      acc[b.tier] = row;
      return acc;
    }, {}),
  );

  return (
    <motion.article
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 190, damping: 18 }}
      className="receipt px-6 pb-10 pt-5"
      aria-label={`Setoran ${deposit.points} poin dari ${deposit.binName}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-soft">{deposit.binName}</p>
          <p className="font-display text-3xl font-black leading-tight">Poin dari sensor</p>
        </div>
        <Countdown expiresAt={deposit.expiresAt} totalMs={totalMs(deposit)} size={60} label="Batas klaim" />
      </div>
      <ul className="mt-3 grid gap-1.5 border-y-2 border-dashed border-stitch py-3">
        {groups.map((g) => (
          <li key={g.tier} className="flex items-baseline justify-between gap-3">
            <span>
              {g.count} botol {g.tier.toLowerCase()}
            </span>
            <span className="font-bold">{g.points} poin</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-bold">Total {deposit.bottleCount} botol</span>
        <Points value={deposit.points} size={24} className="text-3xl" />
      </div>
      <Button variant="thread" loading={busy} onClick={claim} className="mt-4 min-h-14 w-full text-lg">
        Klaim {deposit.points} poin
      </Button>
      <p className="mt-2 text-center text-sm text-ink-soft">Poin hangus bila tidak diklaim sebelum hitung mundur habis.</p>
    </motion.article>
  );
}

/**
 * Spanduk global: muncul di halaman mana pun begitu sensor mencatat poin untuk akun ini.
 * Sekaligus menandai setoran yang lewat batas waktu sebagai hangus dan memberi tahu penggunanya.
 */
export function ClaimBanner() {
  const { user } = useAuth();
  const pathname = usePathname();
  const deposits = useMyDeposits(user?.uid ?? null);
  const now = useNow(1000);
  const sweeping = useRef(new Set<string>());
  const watching = useRef(new Map<string, { points: number; bin: string }>());

  useEffect(() => {
    for (const d of deposits.data ?? []) {
      if (d.status === "pending") {
        watching.current.set(d.id, { points: d.points, bin: d.binName });
        if (d.expiresAt.toMillis() <= now && !sweeping.current.has(d.id)) {
          sweeping.current.add(d.id);
          expireDeposit(d.id).catch(() => sweeping.current.delete(d.id));
        }
      } else if (d.status === "expired" && watching.current.has(d.id)) {
        const info = watching.current.get(d.id)!;
        watching.current.delete(d.id);
        toast.error(`${info.points} poin dari ${info.bin} hangus karena tidak diklaim tepat waktu.`);
      } else if (d.status === "claimed") {
        watching.current.delete(d.id);
      }
    }
  }, [deposits.data, now]);

  const pending = (deposits.data ?? [])
    .filter((d) => d.status === "pending" && d.expiresAt.toMillis() > now)
    .sort((a, b) => a.expiresAt.toMillis() - b.expiresAt.toMillis());
  const first = pending[0];
  const hidden = pathname.startsWith("/hubung");
  const showing = Boolean(first) && !hidden;

  // Konten halaman memberi ruang di bawah sebesar tinggi spanduk, supaya baris terakhir tidak tertutup.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--claim-banner-h", showing ? "6.5rem" : "0px");
    return () => root.style.setProperty("--claim-banner-h", "0px");
  }, [showing]);

  return (
    <AnimatePresence>
      {showing && first && (
        <motion.section
          key={first.id}
          aria-label="Poin menunggu klaim"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0, transition: { duration: 0.18 } }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="fixed inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md lg:inset-x-auto lg:bottom-6 lg:right-6 lg:mx-0 lg:w-[26rem]"
        >
          <ClaimBannerBody deposit={first} extra={pending.length - 1} />
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function ClaimBannerBody({ deposit, extra }: { deposit: WithId<Deposit>; extra: number }) {
  const { busy, claim } = useClaim(deposit);
  return (
    <div className="patch patch-ink flex items-center gap-3 p-3.5 shadow-[0_10px_30px_rgb(10_12_40/0.35)]">
      <div className="rounded-full bg-card p-0.5 text-ink">
        <Countdown expiresAt={deposit.expiresAt} totalMs={totalMs(deposit)} size={54} label="Batas klaim" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">
          {deposit.points} poin dari {deposit.binName}
        </p>
        <p className="text-sm text-on-fill/85">
          Klaim sebelum hangus{extra > 0 ? `, +${extra} setoran lagi` : ""}
        </p>
      </div>
      <Button variant="thread" size="sm" loading={busy} onClick={claim}>
        Klaim
      </Button>
    </div>
  );
}

/** Perayaan layar penuh sesaat, dipicu lewat useCelebration.fire(). */
export function CelebrationOverlay() {
  const current = useCelebration((s) => s.current);
  const clear = useCelebration((s) => s.clear);

  useEffect(() => {
    if (!current) return;
    const id = setTimeout(clear, 2000);
    return () => clearTimeout(id);
  }, [current, clear]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          role="status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[70] grid place-items-center bg-[rgb(29_33_88/0.84)]"
        >
          <motion.div
            initial={{ scale: 0.5, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 14 }}
            className="relative text-center text-on-fill"
          >
            <Burst count={20} />
            <p className="font-display text-[7rem] font-black leading-none text-thread">{current.big}</p>
            <p className="mt-1 text-xl font-bold">{current.small}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
