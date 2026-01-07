import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // 👈 THIS IS CRITICAL. DO NOT DELETE.

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Morning Brew Empire",
  description: "Rostering SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}