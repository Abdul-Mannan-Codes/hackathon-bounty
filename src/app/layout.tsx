import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BountyBoard | Web3 Hackathon Escrow on Monad",
  description: "On-chain hackathon bounties powered by Monad Testnet. Lock MON rewards, submit solutions, and claim rewards on-chain.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#080B11] text-[#E2E8F0] selection:bg-violet-500/30 selection:text-violet-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
