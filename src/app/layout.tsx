import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.scss";
import GlobalHeader from "@components/GlobalHeader";

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

const text = Manrope({
  variable: "--font-text",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Toni",
  description: "Panettone and Pandoro recipe builder with scaling and molds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${text.variable}`}>
        <GlobalHeader />
        {children}
      </body>
    </html>
  );
}
