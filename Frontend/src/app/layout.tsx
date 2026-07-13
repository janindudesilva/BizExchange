import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Business Exchange Platform",
  description: "Buy and sell small businesses securely",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#080c15] text-[#c7d2e0]">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
