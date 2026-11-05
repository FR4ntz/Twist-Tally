import type { SVGProps } from "react";

/*
  Ikon dibuat sebagai siluet padat seperti tambalan kain, bukan garis tipis.
  Tiap bentuk dipilih dari isinya: label harga untuk tukar poin, struk untuk riwayat.
*/
const shapes = {
  home: <path d="M12 2.8 2.6 11.2h2.9V21h5v-6.2h3V21h5v-9.8h2.9z" />,
  scan: (
    <path
      fillRule="evenodd"
      d="M3 6a3 3 0 0 1 3-3h4v3H6v4H3zm18 0v4h-3V6h-4V3h4a3 3 0 0 1 3 3zM3 14h3v4h4v3H6a3 3 0 0 1-3-3zm15 0h3v4a3 3 0 0 1-3 3h-4v-3h4zM9 9h6v6H9z"
    />
  ),
  tag: (
    <path
      fillRule="evenodd"
      d="M3 4.5A1.5 1.5 0 0 1 4.5 3h7.7a2 2 0 0 1 1.4.6l7.3 7.3a2 2 0 0 1 0 2.8l-6.4 6.4a2 2 0 0 1-2.8 0l-7.3-7.3a2 2 0 0 1-.6-1.4zM8 6.3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8z"
    />
  ),
  receipt: (
    <path
      fillRule="evenodd"
      d="M5 2.5h14v19.2l-2.33-1.6-2.34 1.6L12 20.1l-2.33 1.6-2.34-1.6L5 21.7zM8.5 7v1.8h7V7zm0 4v1.8h7V11zm0 4v1.8h4.5V15z"
    />
  ),
  user: <path d="M12 12.2a4.6 4.6 0 1 0 0-9.2 4.6 4.6 0 0 0 0 9.2zM3.5 21.2a8.5 8.5 0 0 1 17 0z" />,
  bottle: (
    <path d="M9.6 2h4.8v2.4l-.4.5c-.2.3-.2.7.1 1 1 1 1.6 2.1 1.6 3.4V20a2 2 0 0 1-2 2h-3.4a2 2 0 0 1-2-2V9.3c0-1.3.6-2.4 1.6-3.4.3-.3.3-.7.1-1l-.4-.5z" />
  ),
  bin: (
    <path d="M9 2.8h6l.8 1.7H21v2.2H3V4.5h5.2zM4.8 8.4h14.4l-1.1 11.5a1.7 1.7 0 0 1-1.7 1.5H7.6a1.7 1.7 0 0 1-1.7-1.5z" />
  ),
  camera: (
    <path
      fillRule="evenodd"
      d="M8 5l1.3-2.2h5.4L16 5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm4 4.2a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z"
    />
  ),
  warning: (
    <path
      fillRule="evenodd"
      d="M12 2.6 1.8 20.4h20.4zM11 9h2v5.5h-2zm0 7h2v2.2h-2z"
    />
  ),
  moon: <path d="M20.6 14.7A8.6 8.6 0 0 1 9.3 3.4a8.6 8.6 0 1 0 11.3 11.3z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.4" />
      <path d="M11 1.8h2v3h-2zm0 17.4h2v3h-2zM1.8 11h3v2h-3zm17.4 0h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4zM5.6 19.8l-1.4-1.4 2.1-2.1 1.4 1.4zM17.7 7.7l-1.4-1.4 2.1-2.1 1.4 1.4z" />
    </>
  ),
  menu: <path d="M3 5.5h18v2.6H3zm0 5.2h18v2.6H3zm0 5.2h18v2.6H3z" />,
  sliders: (
    <path d="M3 5.2h9.4a2.8 2.8 0 0 1 5.4 0H21v2.2h-3.2a2.8 2.8 0 0 1-5.4 0H3zm0 11.4h3.2a2.8 2.8 0 0 1 5.4 0H21v2.2h-9.4a2.8 2.8 0 0 1-5.4 0H3zm0-5.7h9.4a2.8 2.8 0 0 1 5.4 0H21v2.2h-3.2a2.8 2.8 0 0 1-5.4 0H3z" />
  ),
  leaf: <path d="M20.5 3.5C11 3.5 4 8 4 15.5c0 1.5.4 2.8 1 3.9L3 21.5l1.6 1c.3-.2 1.6-1.8 2.4-2.7 1.2.6 2.6.9 4 .9 6 0 9.5-6 9.5-17.2z" />,
  clock: (
    <path
      fillRule="evenodd"
      d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zM11 6.5h2.2V12l3.6 2.1-1.1 1.9-4.7-2.7z"
    />
  ),
  logout: (
    <path d="M4 3h8v2.4H6.4v13.2H12V21H4zm11.4 4.4L21 12l-5.6 4.6-1.5-1.8L16.4 13H9.5v-2h6.9l-2.5-1.8z" />
  ),
  users: (
    <path d="M9 11.4a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM1.8 20.5a7.2 7.2 0 0 1 14.4 0zM16.2 11a3.4 3.4 0 1 0-1.1-6.6 5.5 5.5 0 0 1 0 6.1c.3.3.7.5 1.1.5zm.9 2.1a8.9 8.9 0 0 1 4.9 7.4h-3.7a9.4 9.4 0 0 0-2.5-5.9c.4-.9.9-1.4 1.3-1.5z" />
  ),
} as const;

const strokes = {
  check: <path d="M4.5 12.5l5 5L19.5 7" />,
  close: <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />,
  plus: <path d="M12 4.5v15M4.5 12h15" />,
  minus: <path d="M4.5 12h15" />,
  back: <path d="M15 4.5 7.5 12l7.5 7.5" />,
  forward: <path d="M9 4.5 16.5 12 9 19.5" />,
} as const;

export type IconName = keyof typeof shapes | keyof typeof strokes;

export function Icon({ name, size = 24, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  const isStroke = name in strokes;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill={isStroke ? "none" : "currentColor"}
      stroke={isStroke ? "currentColor" : "none"}
      strokeWidth={isStroke ? 3 : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {isStroke ? strokes[name as keyof typeof strokes] : shapes[name as keyof typeof shapes]}
    </svg>
  );
}

/** Kancing dua lubang dari slide tim. Dipakai sebagai satuan poin dan penanda utama. */
export function Kancing({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="var(--kancing-hole, #fbf8f1)" strokeWidth="1.2" opacity="0.6" />
      <circle cx="9" cy="12" r="1.7" fill="var(--kancing-hole, #fbf8f1)" />
      <circle cx="15" cy="12" r="1.7" fill="var(--kancing-hole, #fbf8f1)" />
    </svg>
  );
}
