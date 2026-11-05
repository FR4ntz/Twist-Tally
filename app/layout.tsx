import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Londrina_Solid } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Judul: huruf potong-tempel mirip font slide tim. Isi: dirancang untuk terbaca jelas di layar ponsel.
const display = Londrina_Solid({
  variable: "--font-londrina",
  subsets: ["latin"],
  weight: ["300", "400", "900"],
});

const body = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Twist & Tally",
  description: "Buang botol plastik ke tempat sampah pintar, scan QR, kumpulkan poin, tukar dengan produk upcycle.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1ece2" },
    { media: "(prefers-color-scheme: dark)", color: "#12152e" },
  ],
};

// Memasang tema sebelum cat pertama supaya halaman tidak berkedip.
const themeScript = `try{var t=localStorage.getItem("tt-theme");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
