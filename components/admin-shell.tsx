"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { claimFirstAdmin, saveSettings } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { useDoc } from "@/lib/hooks";
import { DEFAULT_SETTINGS } from "@/lib/points";
import type { PointsSettings } from "@/lib/types";
import { useRequireUser } from "./app-shell";
import { Icon, type IconName } from "./icons";
import { Logo } from "./logo";
import { toast } from "./providers";
import { Button, Chip, LinkButton, LoadingBlock, Sheet, cn } from "./ui";

const sections: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Ringkasan", icon: "home" },
  { href: "/admin/penukaran", label: "Penukaran", icon: "receipt" },
  { href: "/admin/bin", label: "Tempat sampah", icon: "bin" },
  { href: "/admin/hadiah", label: "Hadiah", icon: "tag" },
  { href: "/admin/pengguna", label: "Pengguna", icon: "users" },
  { href: "/admin/pengaturan", label: "Aturan poin", icon: "sliders" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, loading } = useRequireUser();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const settings = useDoc<PointsSettings>(isAdmin ? "settings/points" : null);

  useEffect(() => {
    if (isAdmin && settings.data === null) saveSettings(DEFAULT_SETTINGS).catch(() => {});
  }, [isAdmin, settings.data]);

  if (loading || !user) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <LoadingBlock label="Memeriksa akses admin..." />
      </div>
    );
  }
  if (!isAdmin) return <NotAdmin uid={user.uid} />;

  // Halaman Deteksi botol tampil penuh tanpa sidebar agar fokus untuk presentasi & pameran.
  if (pathname.startsWith("/admin/deteksi")) {
    return <div className="min-h-dvh">{children}</div>;
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  const activeSection = sections.find((s) => isActive(s.href)) ?? sections[0];
  const adminName = profile?.name || user.displayName || user.email || "Admin";

  const nav = (onNavigate?: () => void) => (
    <nav aria-label="Menu admin" className="grid gap-1.5">
      <Link
        href="/admin/deteksi"
        onClick={onNavigate}
        className="patch patch-denim mb-2 flex items-center justify-between gap-3 p-3.5 transition hover:-translate-y-0.5"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-on-fill/80">Mode Pameran</span>
          <span className="block font-display text-xl font-black leading-tight">Deteksi Ukuran Botol</span>
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-thread text-thread-ink">
          <Icon name="scan" size={18} />
        </span>
      </Link>

      {sections.map((s) => {
        const active = isActive(s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-12 items-center gap-3 rounded-[12px] border-2 px-3 font-bold transition",
              active
                ? "border-ink bg-ink text-paper shadow-[0_3px_0_var(--thread)]"
                : "border-transparent hover:border-stitch/70 hover:bg-card",
            )}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-[8px] transition-colors",
                active ? "bg-thread text-thread-ink" : "bg-paper-deep text-ink group-hover:bg-denim-soft",
              )}
            >
              <Icon name={s.icon} size={18} />
            </span>
            <span>{s.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const outLinks = (
    <div className="grid gap-2 border-t border-edge/30 pt-3 text-sm font-bold">
      <Link
        href="/dashboard"
        className="flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 text-ink-soft transition hover:bg-card hover:text-ink"
      >
        <Icon name="back" size={16} />
        Kembali ke dashboard
      </Link>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-72">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col gap-4 overflow-y-auto border-r border-edge/30 bg-paper-deep/70 p-4 lg:flex">
        <div className="patch p-3.5">
          <Logo href="/admin" />
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-edge/25 pt-2.5">
            <span className="truncate text-xs font-bold text-ink-soft">{adminName}</span>
            <Chip tone="thread">Admin</Chip>
          </div>
        </div>

        {nav()}
        <div className="mt-auto">{outLinks}</div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-edge/30 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <Logo href="/admin" />
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <Chip tone="plain">Studio Admin</Chip>
              <span className="text-sm font-bold text-ink-soft">/</span>
              <span className="font-display text-2xl font-black leading-none">{activeSection.label}</span>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={() => setMenuOpen(true)} className="lg:hidden">
            <Icon name="menu" size={20} />
            Menu
          </Button>
        </div>
      </header>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu admin">
        <div className="grid gap-4">
          {nav(() => setMenuOpen(false))}
          {outLinks}
        </div>
      </Sheet>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function NotAdmin({ uid }: { uid: string }) {
  const router = useRouter();
  const bootstrap = useDoc<Record<string, unknown>>("meta/bootstrap");
  const [busy, setBusy] = useState(false);
  const { logOut } = useAuth();

  async function claim() {
    setBusy(true);
    try {
      await claimFirstAdmin(uid);
      toast.ok("Akun ini sekarang admin.");
    } catch {
      toast.error("Gagal menjadikan akun ini admin. Mungkin admin pertama sudah ditetapkan.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-dvh max-w-md content-center gap-5 px-4 py-8">
      <Logo />
      {bootstrap.loading ? (
        <LoadingBlock label="Memeriksa status admin..." />
      ) : bootstrap.data === null ? (
        <div className="patch p-6">
          <h1 className="text-4xl">Belum ada admin</h1>
          <p className="mt-3 text-ink-soft">
            Admin pertama dipilih sekali saja, oleh akun yang menekan tombol ini lebih dulu. Setelah itu tombol ini hilang
            dan admin baru hanya bisa ditambah oleh admin yang sudah ada.
          </p>
          <Button variant="thread" loading={busy} onClick={claim} className="mt-5 w-full">
            Jadikan akun ini admin pertama
          </Button>
        </div>
      ) : (
        <div className="patch p-6">
          <h1 className="text-4xl">Akun ini bukan admin</h1>
          <p className="mt-3 text-ink-soft">
            Panel ini khusus pengelola Twist &amp; Tally. Minta admin yang ada untuk menambahkan akunmu, atau masuk dengan
            akun admin.
          </p>
          <div className="mt-5 grid gap-2">
            <LinkButton href="/dashboard" variant="primary">
              Kembali ke dashboard
            </LinkButton>
            <Button
              variant="ghost"
              onClick={async () => {
                await logOut();
                router.replace("/masuk?next=%2Fadmin");
              }}
            >
              Ganti akun
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
