import { brand } from "@brand";
import { Bebas_Neue, Outfit } from "next/font/google";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const ui = Outfit({
  subsets: ["latin"],
  variable: "--font-ui",
});

export const metadata = {
  title: brand.name,
  description: brand.tagline,
  icons: { icon: brand.logo.src },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const cssVars = {
    "--ink": brand.colors.ink,
    "--court": brand.colors.court,
    "--court-deep": brand.colors.courtDeep,
    "--lime": brand.colors.lime,
    "--gold": brand.colors.gold,
    "--cream": brand.colors.cream,
    "--mist": brand.colors.mist,
    "--live": brand.colors.live,
    "--panel": brand.colors.panel,
    "--panel-lift": brand.colors.panelLift,
  } as CSSProperties;

  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body style={cssVars}>
        <div className="app-shell">
          <nav className="topbar">
            <Link href="/" className="topbar-brand">
              <img src={brand.logo.src} alt="" width={28} height={28} />
              <span>{brand.shortName}</span>
            </Link>
            <span className="topbar-kit">kit {brand.kitVersion}</span>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
