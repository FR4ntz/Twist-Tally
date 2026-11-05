"use client";

import { useMemo, useState } from "react";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useCollection } from "@/lib/hooks";
import type { UserDoc } from "@/lib/types";
import { EmptyState, ErrorState, Field, LoadingBlock, PageTitle, Points } from "./ui";

export function AdminUsers() {
  const users = useCollection<UserDoc>({ path: "users", orderBy: ["lifetimePoints", "desc"], limit: 500 });
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (users.data ?? []).filter((u) => !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
  }, [users.data, search]);

  return (
    <div>
      <PageTitle title="Pengguna">Diurutkan dari poin sepanjang masa terbanyak.</PageTitle>
      <div className="mb-4">
        <Field label="Cari nama atau email" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
      </div>

      {users.loading ? (
        <LoadingBlock label="Memuat pengguna..." />
      ) : users.error ? (
        <ErrorState title="Pengguna belum bisa dimuat">Periksa koneksi internet, lalu muat ulang halaman.</ErrorState>
      ) : list.length === 0 ? (
        <EmptyState title={search ? "Tidak ada yang cocok" : "Belum ada pengguna"}>
          {search ? "Periksa ejaan nama atau email." : "Pengguna muncul di sini setelah mereka membuat akun."}
        </EmptyState>
      ) : (
        <ul className="divide-y-2 divide-dashed divide-stitch rounded-patch border-2 border-dashed border-stitch px-4">
          {list.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
              <span className="min-w-0">
                <span className="block truncate font-bold">{u.name}</span>
                <span className="block truncate text-sm text-ink-soft">
                  {u.email} · bergabung {formatDateTime(u.createdAt)}
                </span>
              </span>
              <span className="flex items-center gap-4 text-sm">
                <span>{formatNumber(u.totalBottles)} botol</span>
                <Points value={u.points} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
