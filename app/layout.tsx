import "./globals.css";
import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import Script from "next/script";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-title",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "The Jokers Killers",
  description: "Leaderboard com sincronizacao para Discord Activity usando Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${orbitron.variable} ${rajdhani.variable}`} suppressHydrationWarning>
        <Script src="https://discord.com/api/embedded-app-sdk.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
