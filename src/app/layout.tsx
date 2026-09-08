import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "metrix",
  description: "Calculadoras financieras y matemáticas: cuadrática, precios, ROI y actuarial.",
};

const navLinks = [
  { href: "/quadratic", label: "Cuadrática" },
  { href: "/pricing", label: "Precios" },
  { href: "/roi", label: "ROI" },
  { href: "/actuarial", label: "Actuarial" },
  { href: "/historial", label: "Historial" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <header className="border-b border-zinc-200 bg-white">
          <nav
            aria-label="Navegación principal"
            className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3"
          >
            <Link href="/" className="text-lg font-bold tracking-tight">
              metrix
            </Link>
            <div className="flex gap-4 text-sm text-zinc-600">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded outline-none transition hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}