"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authErrorMessage, useAuth } from "@/lib/auth-context";
import heroFabricImg from "@/public/images/hero-fabric-recycle.jpg";
import { FabricBackdrop } from "./fabric-backdrop";
import { Icon } from "./icons";
import { Logo } from "./logo";
import { Button, Field, Tabs } from "./ui";

type Mode = "masuk" | "daftar";

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, signIn, signInWithGoogle, register } = useAuth();
  const next = safeNext(params.get("next"));

  const [mode, setMode] = useState<Mode>(params.get("mode") === "daftar" ? "daftar" : "masuk");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, router, next]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const errors: typeof fieldErrors = {};
    if (mode === "daftar" && name.trim().length < 2) errors.name = "Isi nama minimal 2 huruf.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Isi email yang valid, contoh: nama@kampus.ac.id";
    if (password.length < 6) errors.password = "Kata sandi minimal 6 karakter.";
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      if (mode === "daftar") await register(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setFieldErrors({});
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      router.replace(next);
    } catch (err) {
      setError(authErrorMessage(err));
      setGoogleBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="gingham relative hidden overflow-hidden border-r border-edge/30 lg:block">
        <FabricBackdrop variant="hero" />
        <div className="relative z-10 flex h-full flex-col justify-end gap-8 p-10">
          <div className="patch max-w-md overflow-hidden p-3">
            <Image
              src={heroFabricImg}
              alt="Ilustrasi daur ulang botol menjadi kain tenun"
              className="h-auto w-full rounded-[10px] object-cover"
            />
          </div>
          <div className="patch max-w-md p-7">
            <p className="font-display text-4xl font-black leading-none">Satu akun untuk semua setoranmu.</p>
            <p className="mt-3 text-ink-soft">
              Poin dari setiap kode QR tersimpan di akun ini, dan bisa ditukar jadi produk daur ulang kapan saja.
            </p>
          </div>
        </div>
      </aside>

      <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border-2 border-edge bg-card/70 px-3 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:border-ink hover:bg-paper-deep"
          >
            <Icon name="back" size={18} />
            Kembali
          </Link>
          <Logo />
        </div>
        <div className="patch p-5 sm:p-7">
          <Tabs
            label="Masuk atau buat akun"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
              setFieldErrors({});
            }}
            tabs={[
              { id: "masuk", label: "Masuk" },
              { id: "daftar", label: "Buat akun" },
            ]}
          />

          <div className="mt-5 grid gap-4">
            <Button
              variant="ghost"
              loading={googleBusy}
              disabled={busy}
              onClick={handleGoogle}
              className="w-full border-ink/30 bg-card font-bold text-ink hover:border-ink"
            >
              {!googleBusy && <GoogleMark />}
              {mode === "daftar" ? "Daftar dengan Google" : "Masuk dengan Google"}
            </Button>

            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
              <span className="h-px flex-1 bg-edge/35" aria-hidden="true" />
              <span>atau pakai email</span>
              <span className="h-px flex-1 bg-edge/35" aria-hidden="true" />
            </div>
          </div>

          <form onSubmit={submit} noValidate className="mt-4 grid gap-4" id={`panel-${mode}`} role="tabpanel" aria-labelledby={`tab-${mode}`}>
            {mode === "daftar" && (
              <Field
                label="Nama"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={fieldErrors.name}
                disabled={googleBusy}
              />
            )}
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={googleBusy}
            />
            <Field
              label="Kata sandi"
              name="password"
              type="password"
              autoComplete={mode === "daftar" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              hint={mode === "daftar" ? "Minimal 6 karakter." : undefined}
              disabled={googleBusy}
            />
            {error && (
              <p role="alert" className="rounded-[10px] border-2 border-danger bg-danger-soft px-3.5 py-2.5 text-sm font-bold">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy} disabled={googleBusy} className="mt-1">
              {mode === "daftar" ? "Buat akun" : "Masuk"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
