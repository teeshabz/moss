import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moss",
  description: "Share what you're reading, watching, and listening to",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
