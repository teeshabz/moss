import type { Metadata } from "next";
import "./globals.css";
import { ErrorBoundaryWrapper } from "@/lib/components/ErrorBoundaryWrapper";

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
      <body>
        <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
