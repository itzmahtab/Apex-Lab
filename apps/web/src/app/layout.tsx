import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppFooter, AppHeader } from "@/components/site";
import { MotionProvider } from "@/components/motion-provider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "ApexLab — The science behind the speed", template: "%s · ApexLab" },
  description: "Independent F1 analytics: compare two laps, see where time is gained or lost, and share the result.",
  openGraph: { siteName: "ApexLab", type: "website" },
};
export const viewport: Viewport = { themeColor: "#0B0D10", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
