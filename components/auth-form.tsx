"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authErrorMessage, useAuth } from "@/lib/auth-context";
import { BottleTrio } from "./bottle-art";
import { Logo } from "./logo";
import { Button, Field, Tabs } from "./ui";

type Mode = "masuk" | "daftar";

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/beranda";
}

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, signIn, register } = useAuth();
  const next = safeNext(params.get("next"));

  const [mode, setMode] = useState<Mode>(params.get("mode") === "daftar" ? "daftar" : "masuk");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
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

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="gingham hidden border-r-2 border-dashed border-stitch lg:block">
        <div className="flex h-full flex-col justify-end gap-10 p-10">
          <BottleTrio scale={0.85} />
          <div className="patch max-w-md p-7">
            <p className="font-display text-4xl font-black leading-none">Satu akun untuk semua setoranmu.</p>
            <p className="mt-3 text-ink-soft">
              Poin dari setiap kode QR tersimpan di akun ini, dan bisa ditukar kapan saja selama stok hadiah ada.
            </p>
          </div>
        </div>
      </aside>

      <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-6 px-4 py-8 sm:px-6">
        <Logo />
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
          <form onSubmit={submit} noValidate className="mt-5 grid gap-4" id={`panel-${mode}`} role="tabpanel" aria-labelledby={`tab-${mode}`}>
            {mode === "daftar" && (
              <Field
                label="Nama"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={fieldErrors.name}
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
            />
            {error && (
              <p role="alert" className="rounded-[10px] border-2 border-danger bg-danger-soft px-3.5 py-2.5 text-sm font-bold">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy} className="mt-1">
              {mode === "daftar" ? "Buat akun" : "Masuk"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
