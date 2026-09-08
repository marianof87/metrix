import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "metrix",
  description: "Calculadoras financieras y matemáticas: cuadrática, precios, ROI y actuarial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <header className="border-b border-zinc-200 bg-white">
          <nav className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
            <a href="/" className="text-lg font-bold tracking-tight">metrix</a>
            <div className="flex gap-4 text-sm text-zinc-600">
              <a href="/quadratic" className="hover:text-zinc-900">Cuadrática</a>
              <a href="/pricing" className="hover:text-zinc-900">Precios</a>
              <a href="/roi" className="hover:text-zinc-900">ROI</a>
              <a href="/actuarial" className="hover:text-zinc-900">Actuarial</a>
              <a href="/historial" className="hover:text-zinc-900">Historial</a>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
