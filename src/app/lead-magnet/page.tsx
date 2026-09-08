import type { Metadata } from "next";
import LeadMagnetForm from "@/components/LeadMagnetForm";

export const metadata: Metadata = {
  title: "Simulador de precios · metrix",
  description:
    "Descubrí el precio óptimo de tu producto con un simulador gratuito y descargá un informe personalizado en PDF con tus métricas y una estrategia de precios.",
};

export default function LeadMagnetPage() {
  return (
    <div>
      <header className="mx-auto max-w-2xl py-6 text-center">
        <p className="inline-block rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-medium text-cyan-600">
          Herramienta gratuita de Metrix AI
        </p>
        <h1 className="mt-3 text-3xl font-bold">
          Descubrí el precio óptimo de tu producto
        </h1>
        <p className="mt-3 text-lg text-zinc-500">
          Simulá tu escenario de negocio en segundos y descargá un informe
          personalizado en PDF con tus métricas y una estrategia de precios.
        </p>
      </header>

      <LeadMagnetForm />
    </div>
  );
}