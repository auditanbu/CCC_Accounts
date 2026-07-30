import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { Header } from "@/components/Header";
import { TabBar } from "@/components/Nav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { TEAM_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${TEAM_NAME} — Match & Accounts`,
    template: `%s · ${TEAM_NAME}`,
  },
  description:
    "Match schedule, player collections and team finances for the Eleven Super Kings cricket team.",
  appleWebApp: {
    capable: true,
    title: TEAM_NAME,
    statusBarStyle: "default",
  },
  other: {
    // The standards-track counterpart to appleWebApp above, for Chrome/Android.
    "mobile-web-app-capable": "yes",
  },
};

// Self-hosted at build time — no runtime request to Google. Apple system fonts
// sit ahead of it in the stack (see tailwind.config.ts), so iPhones get real
// SF Pro and everyone else gets Inter.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#F2F2F7",
  // Lets content draw under the notch / home indicator so the safe-area
  // insets in globals.css (--safe-bottom) actually resolve to something —
  // without this they're always 0, which only bites once the app runs
  // full-screen as an installed PWA with no Safari chrome to fall back on.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh">
        <ServiceWorkerRegister />
        <Header />
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:pb-12">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
