"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
  type WhereFilterOp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { WithId } from "./types";

export type QuerySpec = {
  path: string;
  where?: [string, WhereFilterOp, unknown][];
  orderBy?: [string, "asc" | "desc"];
  limit?: number;
};

type Result<T> = { data: T; loading: boolean; error: Error | null };

type Snap<T> = { key: string; data: T; error: Error | null };

export function useDoc<T extends DocumentData>(path: string | null): Result<WithId<T> | null | undefined> {
  const [snap, setSnap] = useState<Snap<WithId<T> | null> | null>(null);

  useEffect(() => {
    if (!path) return;
    return onSnapshot(
      doc(db, path),
      { includeMetadataChanges: false },
      (s) =>
        setSnap({
          key: path,
          data: s.exists() ? ({ id: s.id, ...s.data({ serverTimestamps: "estimate" }) } as WithId<T>) : null,
          error: null,
        }),
      (error) => setSnap({ key: path, data: null, error }),
    );
  }, [path]);

  const ready = path !== null && snap?.key === path;
  return {
    data: ready ? snap.data : undefined,
    loading: path !== null && !ready,
    error: ready ? snap.error : null,
  };
}

export function useCollection<T extends DocumentData>(spec: QuerySpec | null): Result<WithId<T>[] | undefined> {
  const key = spec ? JSON.stringify(spec) : null;
  const [snap, setSnap] = useState<Snap<WithId<T>[]> | null>(null);

  useEffect(() => {
    if (!key) return;
    const parsed = JSON.parse(key) as QuerySpec;
    const constraints: QueryConstraint[] = [];
    parsed.where?.forEach(([field, op, value]) => constraints.push(where(field, op, value)));
    if (parsed.orderBy) constraints.push(orderBy(parsed.orderBy[0], parsed.orderBy[1]));
    if (parsed.limit) constraints.push(limitTo(parsed.limit));
    return onSnapshot(
      query(collection(db, parsed.path), ...constraints),
      (s) =>
        setSnap({
          key,
          data: s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }) as WithId<T>),
          error: null,
        }),
      (error) => setSnap({ key, data: [], error }),
    );
  }, [key]);

  const ready = key !== null && snap?.key === key;
  return {
    data: ready ? snap.data : undefined,
    loading: key !== null && !ready,
    error: ready ? snap.error : null,
  };
}

/** Jam yang berdetak tiap detik, untuk hitung mundur kedaluwarsa. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
