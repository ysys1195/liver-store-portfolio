import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Liver Store Portfolio",
  description:
    "A fictional merchandise store built as an unofficial portfolio demo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
