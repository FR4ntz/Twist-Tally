"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { renameUser } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import { Icon } from "./icons";
import { toast, useTheme } from "./providers";
import { Button, Field, LinkButton, PageTitle, Switch } from "./ui";

export function ProfileView() {
  const router = useRouter();
  const { profile, user, isAdmin, logOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(profile?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile || !user) return null;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const clean = name.trim();
    if (clean.length < 2) {
      setError("Isi nama minimal 2 huruf.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await renameUser(user.uid, clean);
      toast.ok("Nama diperbarui.");
    } catch {
      toast.error("Nama belum tersimpan. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    await logOut();
    router.replace("/");
  }

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <PageTitle title="Profil" />

      <dl className="grid grid-cols-2 gap-3">
        <div className="patch patch-denim px-5 py-4">
          <dt className="text-sm text-on-fill/85">Botol disetor</dt>
          <dd className="font-display text-5xl font-black leading-none">{formatNumber(profile.totalBottles)}</dd>
        </div>
        <div className="patch patch-linen px-5 py-4">
          <dt className="text-sm text-ink-soft">Poin sepanjang masa</dt>
          <dd className="font-display text-5xl font-black leading-none">{formatNumber(profile.lifetimePoints)}</dd>
        </div>
      </dl>

      <form onSubmit={save} noValidate className="patch grid gap-4 p-5">
        <Field label="Nama" value={name} onChange={(e) => setName(e.target.value)} error={error} autoComplete="name" />
        <Field label="Email" value={profile.email} readOnly hint="Email dipakai untuk masuk dan tidak bisa diubah di sini." />
        <Button type="submit" loading={busy} disabled={name.trim() === profile.name}>
          Simpan nama
        </Button>
      </form>

      <div className="patch p-5">
        <Switch checked={theme === "dark"} onChange={(on) => setTheme(on ? "dark" : "light")} label="Tampilan gelap" />
      </div>

      <div className="grid gap-3">
        {isAdmin && (
          <LinkButton href="/admin" variant="ghost">
            <Icon name="sliders" size={20} />
            Buka panel admin
          </LinkButton>
        )}
        <Button variant="ghost" onClick={leave}>
          <Icon name="logout" size={20} />
          Keluar dari akun
        </Button>
      </div>
    </div>
  );
}
