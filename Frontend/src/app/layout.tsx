import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BizExchange | Buy & Sell Verified Businesses Securely",
  description:
    "Premier marketplace for buying, selling, and investing in profitable small businesses with verified financial data and confidential inquiries.",
  keywords: ["buy business", "sell business", "business marketplace", "verified businesses", "Sri Lanka business for sale"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geist.variable} ${geistMono.variable} min-h-screen flex flex-col font-sans bg-[#070b14] text-[#e2e8f0] antialiased selection:bg-[#00cfa8]/20 selection:text-[#00cfa8]`}
      >
        <Navbar />
        <div className="flex-1 w-full bg-radial-ambient">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
