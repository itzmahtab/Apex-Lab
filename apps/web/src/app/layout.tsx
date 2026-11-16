import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AppFooter, AppHeader } from "@/components/site";
import { MotionProvider } from "@/components/motion-provider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "ApexLab · The science behind the speed", template: "%s · ApexLab" },
  description: "Compare any two F1 laps from 2023 onwards: lap and sector deltas, speed, throttle and brake traces, and a track dominance map. Share the result with one link.",
  openGraph: { siteName: "ApexLab", type: "website" },
};
export const viewport: Viewport = { themeColor: "#08090c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh flex flex-col antialiased">
        <MotionProvider>
          <AppHeader />
          {children}
          <AppFooter />
        </MotionProvider>
      </body>
    </html>
  );
}
