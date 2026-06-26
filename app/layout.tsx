import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { BackToTop } from "@/components/BackToTop";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portrait de territoire",
  description:
    "Générez une fiche territoriale claire à partir de données publiques françaises, enrichie d'une analyse IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-100 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-semibold text-slate-900">
                Portrait de territoire
              </Link>
              <Link
                href="/compare"
                className="text-sm font-medium text-slate-600 hover:text-blue-700"
              >
                Comparer
              </Link>
            </div>
            <span className="text-xs text-slate-500">MVP · données publiques</span>
          </div>
        </header>
        {children}
        <footer className="mt-auto border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-slate-500">
            Données issues de sources publiques · Analyse IA Mistral côté serveur
          </div>
        </footer>
        <BackToTop />
      </body>
    </html>
  );
}
