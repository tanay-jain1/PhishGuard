import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PhishGuard - Learn to Spot Phishing Emails",
  description: "A web game that teaches users to identify phishing emails and protect themselves online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-gradient-to-b from-white to-[#dbeafe] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
