"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ActionError, redeemReward } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { useCelebration } from "@/lib/celebrate";
import { useCollection } from "@/lib/hooks";
import type { Redemption, Reward, WithId } from "@/lib/types";
import { Kancing } from "./icons";
import { toast } from "./providers";
import { VoucherSheet } from "./rows";
import { Button, Chip, EmptyState, ErrorState, LinkButton, LoadingBlock, PageTitle, Points, Sheet, cn } from "./ui";

export function RewardsView() {
  const { profile } = useAuth();
  const rewards = useCollection<Reward>({ path: "rewards", orderBy: ["pointsCost", "asc"], limit: 100 });
  const [category, setCategory] = useState<string>("Semua");
  const [selected, setSelected] = useState<WithId<Reward> | null>(null);
  const [voucher, setVoucher] = useState<WithId<Redemption> | null>(null);
  const [busy, setBusy] = useState(false);

  const balance = profile?.points ?? 0;
  const active = useMemo(() => (rewards.data ?? []).filter((r) => r.active), [rewards.data]);
  const categories = useMemo(() => ["Semua", ...Array.from(new Set(active.map((r) => r.category).filter(Boolean)))], [active]);

  const shown = useMemo(() => {
    const list = category === "Semua" ? active : active.filter((r) => r.category === category);
    const rank = (r: Reward) => (r.stock <= 0 ? 2 : r.pointsCost <= balance ? 0 : 1);
    return [...list].sort((a, b) => rank(a) - rank(b) || a.pointsCost - b.pointsCost);
  }, [active, category, balance]);

  const live = selected ? (active.find((r) => r.id === selected.id) ?? selected) : null;

  async function redeem() {
    if (!profile || !live) return;
    setBusy(true);
    try {
      const result = await redeemReward(profile, live);
      setSelected(null);
      setVoucher(result);
      useCelebration.getState().fire("Voucher siap", live.name);
    } catch (error) {
      toast.error(error instanceof ActionError ? error.message : "Penukaran gagal. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageTitle title="Tukar poin">Pilih hadiah, tukar, lalu tunjukkan kode vouchernya ke admin.</PageTitle>

      <div className="mb-5 flex items-center justify-between gap-3 rounded-patch border-2 border-dashed border-stitch px-4 py-3">
        <span className="text-ink-soft">Saldomu</span>
        <Points value={balance} size={22} className="text-2xl" />
      </div>

      {rewards.loading ? (
        <LoadingBlock label="Memuat katalog hadiah..." />
      ) : rewards.error ? (
        <ErrorState title="Katalog belum bisa dimuat">Periksa koneksi internetmu, lalu buka ulang halaman ini.</ErrorState>
      ) : active.length === 0 ? (
        <EmptyState title="Katalog hadiah masih kosong">
          Admin belum menambahkan hadiah. Poinmu tetap aman dan bisa dipakai begitu katalog terisi.
        </EmptyState>
      ) : (
        <>
          {categories.length > 2 && (
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter kategori">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "min-h-11 rounded-[10px] border-2 px-4 text-sm font-bold",
                    category === c ? "border-ink bg-ink text-paper" : "border-edge text-ink hover:bg-paper-deep",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <ul className="grid gap-4 sm:grid-cols-2">
            {shown.map((reward, i) => {
              const out = reward.stock <= 0;
              const lacking = reward.pointsCost - balance;
              return (
                <motion.li
                  key={reward.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ rotate: i % 2 ? -1.8 : 1.8 }}
                  transition={{ duration: 0.25, delay: Math.min(i, 6) * 0.04 }}
                  style={{ transformOrigin: "50% 0" }}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(reward)}
                    className={cn(
                      "patch flex h-full w-full flex-col gap-2 p-5 pt-7 text-left transition-transform hover:-translate-y-0.5 active:translate-y-px",
                      out && "opacity-70",
                    )}
                  >
                    <span className="absolute left-1/2 top-2 -translate-x-1/2 text-edge">
                      <Kancing size={14} className="[--kancing-hole:var(--card)]" />
                    </span>
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-ink-soft">{reward.category}</span>
                      {reward.isSample && <Chip>Contoh</Chip>}
                    </span>
                    {reward.imageUrl && (
                      // Alamat gambar diisi admin dan bisa dari host mana pun, jadi tidak lewat next/image.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={reward.imageUrl}
                        alt={reward.name}
                        width={320}
                        height={200}
                        loading={i < 2 ? "eager" : "lazy"}
                        className="aspect-[8/5] w-full rounded-[8px] bg-paper-deep object-cover"
                      />
                    )}
                    <span className="font-display text-3xl font-black leading-[1.02]">{reward.name}</span>
                    <span className="mt-auto flex items-end justify-between gap-2 pt-3">
                      <Points value={reward.pointsCost} size={22} className="text-2xl" />
                      <span className="text-right text-sm font-bold">
                        {out ? (
                          <Chip tone="danger">Stok habis</Chip>
                        ) : lacking > 0 ? (
                          <span className="text-ink-soft">Kurang {lacking} poin</span>
                        ) : (
                          <Chip tone="thread">Bisa ditukar</Chip>
                        )}
                      </span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </>
      )}

      <Sheet open={live !== null} onClose={() => setSelected(null)} title={live?.name ?? "Hadiah"}>
        {live && (
          <div className="grid gap-4">
            {live.imageUrl && (
              // Alamat gambar diisi admin dan bisa dari host mana pun, jadi tidak lewat next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={live.imageUrl}
                alt={live.name}
                width={560}
                height={350}
                className="aspect-[8/5] w-full rounded-[10px] bg-paper-deep object-cover"
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Chip>{live.category}</Chip>
              {live.isSample && <Chip>Contoh</Chip>}
              <Chip tone={live.stock > 0 ? "plain" : "danger"}>{live.stock > 0 ? `Stok ${live.stock}` : "Stok habis"}</Chip>
            </div>
            {live.description && <p className="text-ink-soft">{live.description}</p>}
            <dl className="grid gap-2 rounded-[12px] bg-paper-deep p-4">
              <div className="flex items-center justify-between">
                <dt>Harga</dt>
                <dd>
                  <Points value={live.pointsCost} />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Saldomu sekarang</dt>
                <dd>
                  <Points value={balance} />
                </dd>
              </div>
              <div className="flex items-center justify-between border-t-2 border-dashed border-stitch pt-2">
                <dt>Sisa setelah tukar</dt>
                <dd className={balance - live.pointsCost < 0 ? "font-bold text-danger" : ""}>
                  {balance - live.pointsCost < 0 ? (
                    `Kurang ${live.pointsCost - balance} poin`
                  ) : (
                    <Points value={balance - live.pointsCost} />
                  )}
                </dd>
              </div>
            </dl>
            {live.stock > 0 && balance >= live.pointsCost ? (
              <Button variant="thread" loading={busy} onClick={redeem} className="min-h-14 text-lg">
                Tukar {live.pointsCost} poin
              </Button>
            ) : (
              <>
                <Button variant="thread" disabled className="min-h-14 text-lg">
                  {live.stock <= 0 ? "Stok habis" : `Kurang ${live.pointsCost - balance} poin`}
                </Button>
                {live.stock > 0 && (
                  <LinkButton href="/scan" variant="ghost">
                    Scan QR untuk tambah poin
                  </LinkButton>
                )}
              </>
            )}
          </div>
        )}
      </Sheet>

      <VoucherSheet redemption={voucher} onClose={() => setVoucher(null)} />
    </div>
  );
}
