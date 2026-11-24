import Image from "next/image";
import Link from "next/link";
import logoMark from "@/public/images/logo-mark.png";

export function Logo({ href = "/", inverted = false }: { href?: string; inverted?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center gap-2 font-display text-[1.65rem] font-black leading-none ${
        inverted ? "text-on-fill" : "text-ink"
      }`}
    >
      <span className="grid size-9 place-items-center rounded-[10px] bg-card/95 p-1 shadow-[0_1px_0_rgb(29_33_88/0.14)]">
        <Image src={logoMark} alt="" width={28} height={36} className="h-7 w-auto object-contain" priority />
      </span>
      <span>Twist &amp; Tally</span>
    </Link>
  );
}
