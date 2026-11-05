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
import { Button, LinkButton, LoadingBlock, Sheet, cn } from "./ui";

const sections: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Ringkasan", icon: "home" },
  { href: "/admin/penukaran", label: "Penukaran", icon: "receipt" },
  { href: "/admin/bin", label: "Tempat sampah", icon: "bin" },
  { href: "/admin/simulator", label: "Simulator sensor", icon: "bottle" },
  { href: "/admin/hadiah", label: "Hadiah", icon: "tag" },
  { href: "/admin/pengguna", label: "Pengguna", icon: "users" },
  { href: "/admin/pengaturan", label: "Aturan poin", icon: "sliders" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useRequireUser();
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

  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  const current = sections.find((s) => isActive(s.href));

  const nav = (onNavigate?: () => void) => (
    <nav aria-label="Menu admin" className="grid gap-1">
      {sections.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          onClick={onNavigate}
          aria-current={isActive(s.href) ? "page" : undefined}
          className={cn(
            "flex min-h-12 items-center gap-3 rounded-[10px] px-3 font-bold",
            isActive(s.href) ? "bg-ink text-paper" : "hover:bg-paper-deep",
          )}
        >
          <Icon name={s.icon} size={20} />
          {s.label}
        </Link>
      ))}
    </nav>
  );

  const outLinks = (
    <div className="grid gap-1 border-t-2 border-dashed border-stitch pt-3 text-sm font-bold">
      <Link href="/bin" className="inline-flex min-h-11 items-center gap-2 px-3 hover:underline">
        Layar tempat sampah
      </Link>
      <Link href="/beranda" className="inline-flex min-h-11 items-center gap-2 px-3 hover:underline">
        Kembali ke aplikasi
      </Link>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-4 overflow-y-auto border-r-2 border-dashed border-stitch bg-paper p-4 lg:flex">
        <Logo href="/admin" />
        <p className="px-3 text-sm font-bold text-ink-soft">Panel admin</p>
        {nav()}
        <div className="mt-auto">{outLinks}</div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b-2 border-dashed border-stitch bg-paper px-4 py-1 lg:hidden">
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink-soft">Panel admin</p>
          <p className="truncate font-display text-2xl font-black leading-none">{current?.label ?? "Admin"}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setMenuOpen(true)}>
          <Icon name="menu" size={20} />
          Menu
        </Button>
      </header>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu admin">
        <div className="grid gap-4">
          {nav(() => setMenuOpen(false))}
          {outLinks}
        </div>
      </Sheet>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-5 sm:px-6 lg:pt-8">{children}</main>
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
            <LinkButton href="/beranda" variant="primary">
              Kembali ke aplikasi
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
