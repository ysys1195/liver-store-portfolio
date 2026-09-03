import type { Metadata } from "next";

import { Footer } from "@/components/footer";

import "./globals.css";

export const metadata: Metadata = {
  title: "Liver Store Portfolio",
  description:
    "A fictional merchandise store built as an unofficial portfolio demo.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
