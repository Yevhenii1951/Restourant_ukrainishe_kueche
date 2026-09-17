import type { Metadata } from "next";
import { Header } from "@/components/shell/header";
import { Footer } from "@/components/shell/footer";
import SkipLink from "@/components/shell/skip-link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalyna — Ukrainische Küche in Kassel",
  description: "Portfoliorestaurant — Demo. Kein reales Gewerbe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased">
        <SkipLink />
        <Header />
        <main id="main" className="mx-auto max-w-5xl px-4 py-12">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
