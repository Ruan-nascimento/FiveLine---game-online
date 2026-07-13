import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants/app";

export const metadata: Metadata = { title: { default: APP_NAME, template: `%s · ${APP_NAME}` }, description: APP_TAGLINE };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><SiteHeader /><main>{children}</main><footer>© {new Date().getFullYear()} {APP_NAME} · Jogue com estratégia.</footer></body></html>;
}
