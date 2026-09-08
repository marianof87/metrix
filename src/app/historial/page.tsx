import type { Metadata } from "next";
import ScenarioList from "@/components/ScenarioList";

export const metadata: Metadata = {
  title: "Historial · metrix",
  description:
    "Escenarios guardados: lista, detalle, auditoría y re-ejecución desde historial.",
};

export default function HistorialPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Historial</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Escenarios guardados (scope "default"). Consulte el detalle, la
        auditoría o re-ejecute un escenario para crear un registro RE_RUN.
      </p>
      <div className="mt-6">
        <ScenarioList />
      </div>
    </div>
  );
}