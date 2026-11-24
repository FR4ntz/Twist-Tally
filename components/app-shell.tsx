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
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/tukar", label: "Tukar", icon: "tag" },
  { href: "/riwayat", label: "Riwayat", icon: "receipt" },
  { href: "/profil", label: "Profil", icon: "user" },
];

const navLinks: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scan", label: "Scan QR" },
  { href: "/tukar", label: "Tukar" },
  { href: "/riwayat", label: "Riwayat" },
  { href: "/profil", label: "Profil" },
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

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const onDashboard = isActive("/dashboard");
  const visibleLinks = onDashboard ? navLinks.filter((l) => l.href !== "/dashboard") : navLinks;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-edge/30 bg-paper/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
          <Logo href="/" />

          <div className="flex items-center gap-2 sm:gap-3">
            <nav aria-label="Menu utama" className="hidden items-center gap-1 md:flex">
              {visibleLinks.map((item) => {
                const active = isActive(item.href) || (item.href === "/scan" && isActive("/hubung"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-11 items-center whitespace-nowrap rounded-[10px] px-3 text-sm font-bold transition-colors",
                      active ? "text-paper" : "text-ink-soft hover:bg-paper-deep hover:text-ink",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="top-nav-pill"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-[10px] bg-ink"
                      />
                    )}
                    <span className="relative">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <Link
              href="/riwayat"
              aria-label={`Saldo ${profile.points} poin, buka riwayat`}
              className="flex min-h-11 items-center rounded-[10px] border border-edge/40 bg-card px-3 shadow-[0_2px_0_rgb(154_161_204/0.35)] transition hover:-translate-y-0.5 hover:border-ink"
            >
              <Points value={profile.points} />
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-[10px] border-2 border-ink bg-thread px-3.5 text-sm font-bold text-thread-ink shadow-[0_2px_0_var(--ink)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px"
            >
              <Icon name="home" size={16} />
              Utama
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(8.5rem+var(--claim-banner-h,0px))] pt-6 sm:px-6 md:pb-[calc(3rem+var(--claim-banner-h,0px))] md:pt-8">
        {children}
      </main>

      <ClaimBanner />
      <CelebrationOverlay />

      <nav
        aria-label="Menu utama ponsel"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-edge/35 bg-paper/95 backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 items-end">
          {items.slice(0, 2).map((item) => (
            <NavSlot key={item.href} item={item} active={isActive(item.href)} />
          ))}
          <li className="flex justify-center">
            <motion.div whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.94 }}>
              <Link
                href="/scan"
                aria-label="Scan QR tempat sampah"
                aria-current={isActive("/scan") || isActive("/hubung") ? "page" : undefined}
                className="-mt-7 grid size-16 place-items-center rounded-full border-4 border-thread bg-ink text-paper shadow-[0_8px_20px_rgb(29_33_88/0.32)] transition-colors"
              >
                <Icon name="scan" size={30} />
              </Link>
            </motion.div>
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
