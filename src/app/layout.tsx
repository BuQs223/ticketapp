import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SupabaseAuthListener from "@/components/SupabaseAuthListener";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ticket App",
  description: "Your simple ticket management application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SupabaseAuthListener />
        {children}
      </body>
    </html>
  );
}
