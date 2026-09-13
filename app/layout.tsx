import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displayFont = Poppins({
  variable: "--font-display",
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fruity — Cidra com Sabor",
  description: "Pear, Apple ou Exotic — escolha o sabor da sua cidra.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
