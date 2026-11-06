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

const SAMPAH_ID = /^SB-[A-Z0-9]{4}$/;

export function newSampahId(): string {
  return `SB-${randomChars(4)}`;
}

/** Terima ID polos (SB-7K3P) atau URL hasil scan QR tempat sampah (?sampah=SB-7K3P). */
export function extractSampahId(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  let candidate = text;
  try {
    candidate = new URL(text).searchParams.get("sampah") ?? "";
  } catch {
    // bukan URL, anggap ID polos
  }
  const cleaned = candidate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const id = cleaned.startsWith("SB") && cleaned.length === 6 ? `SB-${cleaned.slice(2)}` : "";
  return SAMPAH_ID.test(id) ? id : null;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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
