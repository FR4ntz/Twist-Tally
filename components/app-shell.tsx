"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { ClaimBanner, CelebrationOverlay } from "./claims";
import { Icon, type IconName } from "./icons";
import { Logo } from "./logo";
import { LoadingBlock, Points, cn } from "./ui";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/beranda", label: "Beranda", icon: "home" },
  { href: "/tukar", label: "Tukar", icon: "tag" },
  { href: "/riwayat", label: "Riwayat", icon: "receipt" },
  { href: "/profil", label: "Profil", icon: "user" },
];

export function useRequireUser() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;

  useEffect(() => {
    if (!auth.loading && !auth.user) router.replace(`/masuk?next=${encodeURIComponent(here)}`);
  }, [auth.loading, auth.user, router, here]);

  return auth;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useRequireUser();
  const pathname = usePathname();

  if (loading || !user || !profile) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <LoadingBlock label="Membuka akunmu..." />
      </div>
    );
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 border-r-2 border-dashed border-stitch bg-paper p-5 lg:flex">
        <Logo href="/" />
        <nav aria-label="Menu utama" className="grid gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 items-center gap-3 rounded-[12px] px-3 font-bold transition-colors",
                isActive(item.href) ? "text-paper" : "text-ink hover:bg-paper-deep",
              )}
            >
              {isActive(item.href) && (
                <motion.span layoutId="rail-pill" className="absolute inset-0 rounded-[12px] bg-ink" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
              )}
              <span className="relative flex items-center gap-3">
                <Icon name={item.icon} size={22} />
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
        <Link
          href="/scan"
          className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-thread px-4 font-bold text-thread-ink hover:brightness-105"
        >
          <Icon name="scan" size={22} />
          Scan QR tempat sampah
        </Link>
        <div className="mt-auto">
          <p className="text-sm text-ink-soft">Saldo poin</p>
          <Points value={profile.points} size={22} className="text-2xl" />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-paper px-4 py-1 lg:hidden">
        <Logo href="/" />
        <Link
          href="/riwayat"
          aria-label={`Saldo ${profile.points} poin, buka riwayat`}
          className="flex min-h-11 items-center rounded-[10px] bg-paper-deep px-3"
        >
          <Points value={profile.points} />
        </Link>
        <span aria-hidden="true" className="gingham absolute inset-x-0 -bottom-[2px] h-[6px]" />
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(9rem+var(--claim-banner-h,0px))] pt-5 sm:px-6 lg:pb-[calc(3rem+var(--claim-banner-h,0px))] lg:pt-8">{children}</main>

      <ClaimBanner />
      <CelebrationOverlay />

      <nav
        aria-label="Menu utama"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t-2 border-dashed border-stitch bg-paper lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 items-end">
          {items.slice(0, 2).map((item) => (
            <NavSlot key={item.href} item={item} active={isActive(item.href)} />
          ))}
          <li className="flex justify-center">
            <Link
              href="/scan"
              aria-label="Scan QR tempat sampah"
              aria-current={isActive("/scan") || isActive("/hubung") ? "page" : undefined}
              className="-mt-7 grid size-16 place-items-center rounded-full bg-ink text-paper outline-2 outline-offset-4 outline-dashed outline-thread"
            >
              <Icon name="scan" size={30} />
            </Link>
          </li>
          {items.slice(2).map((item) => (
            <NavSlot key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </ul>
      </nav>
    </div>
  );
}

function NavSlot({ item, active }: { item: (typeof items)[number]; active: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 flex-col items-center justify-center gap-0.5 pt-1.5 text-xs font-bold",
          active ? "text-ink" : "text-ink-soft",
        )}
      >
        <span className={cn("relative grid h-7 w-12 place-items-center rounded-full", active && "text-thread-ink")}>
          {active && (
            <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-thread" transition={{ type: "spring", stiffness: 420, damping: 30 }} />
          )}
          <span className="relative">
            <Icon name={item.icon} size={22} />
          </span>
        </span>
        {item.label}
      </Link>
    </li>
  );
}
