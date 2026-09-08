import Link from "next/link";

const modules = [
  { href: "/quadratic", title: "Calculadora cuadrática", desc: "Raíces, vértice, concavidad y tabla de valores de f(x)=ax²+bx+c." },
  { href: "/pricing", title: "Simulador de precios", desc: "Calcule precio sugerido, margen, impuestos y descuentos." },
  { href: "/roi", title: "Calculadora de ROI", desc: "Retorno simple y anualizado, NPV, payback e IRR." },
  { href: "/actuarial", title: "Actuario", desc: "Interés compuesto, anualidades, valor presente y primas." },
  { href: "/lead-magnet", title: "Lead magnet de precios", desc: "Precio óptimo, ganancia máxima y estrategia, con informe PDF." },
];

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold">metrix</h1>
      <p className="mt-2 text-zinc-600">
        Herramientas de cálculo financiero y matemático. Elija un módulo para comenzar.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow"
          >
            <h2 className="text-lg font-semibold">{m.title}</h2>
            <p className="mt-1 text-sm text-zinc-600">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
