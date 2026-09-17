import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalyna — Ukrainische Küche in Kassel",
  description: "Portfoliorestaurant — Demo. Kein reales Gewerbe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased">
        <main className="mx-auto max-w-5xl px-4 py-12">{children}</main>
      </body>
    </html>
  );
}
