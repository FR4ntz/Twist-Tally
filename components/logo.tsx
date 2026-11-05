import Link from "next/link";
import { Kancing } from "./icons";

/** Placeholder logo: nama sebagai teks. Ganti dengan logo resmi tim lewat komponen ini. */
export function Logo({ href = "/", inverted = false }: { href?: string; inverted?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center gap-2 font-display text-[1.65rem] font-black leading-none ${
        inverted ? "text-on-fill" : "text-ink"
      }`}
    >
      <Kancing size={26} className="text-fill [--kancing-hole:#fbf8f1]" />
      <span>Twist &amp; Tally</span>
    </Link>
  );
}
