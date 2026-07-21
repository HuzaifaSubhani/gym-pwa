import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ProtocolProvider } from "@/hooks/useProtocolStore";
import RestTimer from "@/components/workouts/RestTimer";
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "IronCore",
  description: "IronCore Protocol Tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IronCore",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming on inputs for native feel
};

import ErrorBoundary from "@/components/shared/ErrorBoundary";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-noir-bg text-noir-text overscroll-none pb-safe">
        <ErrorBoundary>
          <ProtocolProvider>
            {children}
            <RestTimer />
          </ProtocolProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
