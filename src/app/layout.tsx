import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ButtonSoundListener } from "@/components/ui/ButtonSoundListener";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants/app";

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="app-atmosphere" aria-hidden="true" />
        <ButtonSoundListener />
        <SiteHeader />
        <main>{children}</main>
        <footer>
          <span className="footer-brand">{APP_NAME}</span>
          <span>© {new Date().getFullYear()} · Partidas rápidas de cinco em linha</span>
        </footer>
      </body>
    </html>
  );
}
