import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Waste Segregation Dashboard",
  description: "Real-time AI waste item classification & sorting monitoring dashboard",
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

