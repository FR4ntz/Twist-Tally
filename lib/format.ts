import type { Timestamp } from "firebase/firestore";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomChars(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function newDepositCode(): string {
  return randomChars(12);
}

export function newVoucherCode(): string {
  return randomChars(8);
}

export function groupCode(code: string, size = 4): string {
  return code.match(new RegExp(`.{1,${size}}`, "g"))?.join("-") ?? code;
}

/** Terima kode polos, kode ber-strip, atau URL hasil scan QR. */
export function extractDepositCode(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  let candidate = text;
  try {
    const url = new URL(text);
    candidate = url.searchParams.get("kode") ?? "";
  } catch {
    // bukan URL, anggap kode polos
  }
  const cleaned = candidate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.length === 12 ? cleaned : null;
}

export function toDate(value: Timestamp | null | undefined): Date | null {
  return value ? value.toDate() : null;
}

const dateTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(value: Timestamp | null | undefined): string {
  const date = toDate(value);
  return date ? dateTime.format(date) : "Baru saja";
}

const number = new Intl.NumberFormat("id-ID");

export function formatNumber(value: number): string {
  return number.format(value);
}

export function fillPercent(bottleCount: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((bottleCount / capacity) * 100));
}
