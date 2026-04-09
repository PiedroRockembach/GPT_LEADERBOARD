import "./globals.css";
import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";

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
        {/* TODO: CSP HEADERS */}
        {children}
      </body>
    </html>
  );
}
