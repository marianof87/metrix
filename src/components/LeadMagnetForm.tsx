"use client";

/**
 * metrix · components/LeadMagnetForm.tsx
 * Simulador de precios del lead magnet: inputs, cálculo, curva de ganancia
 * y descarga del informe PDF. Contrato honesto OBJ-2.
 */

import { useState } from "react";
import ProfitChart from "./ProfitChart";
import LeadModal from "./LeadModal";
import { generarInformePdf } from "@/lib/informePdf";
import type { LeadInputSchema } from "@/lib/validation";

import type { Outcome } from "@/domain/shared/outcome";

interface LeadMagnetResult {
  formulaVersion: string;
  outcomes: Outcome[];
  curva: { x: number; y: number }[];
}

const DEFAULTS: Record<string, string> = {
  a: "-2",
  b: "120",
  c: "-1000",
  min: "10",
  max: "100",
  cost: "5",
};

const CAMPOS = [
  {
    key: "a",
    label: "Coeficiente A — sensibilidad (negativo)",
    placeholder: "Ej. -2",
    testid: "lm-a",
  },
  {
    key: "b",
    label: "Coeficiente B — demanda",
    placeholder: "Ej. 120",
    testid: "lm-b",
  },
  {
    key: "c",
    label: "Coeficiente C — costos fijos",
    placeholder: "Ej. -1000",
    testid: "lm-c",
  },
  {
    key: "min",
    label: "Precio mínimo ($)",
    placeholder: "Ej. 10",
    testid: "lm-min",
  },
  {
    key: "max",
    label: "Precio máximo ($)",
    placeholder: "Ej. 100",
    testid: "lm-max",
  },
  {
    key: "cost",
    label: "Costo unitario ($)",
    placeholder: "Ej. 5",
    testid: "lm-cost",
  },
];

export default function LeadMagnetForm() {
  const [values, setValues] = useState<Record<string, string>>(DEFAULTS);
  const [result, setResult] = useState<LeadMagnetResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleCalculate = async () => {
    setError(null);
    setMensajeExito(null);
    setIsLoading(true);
    try {
      const inputs = {
        demandA: Number(values.a),
        demandB: Number(values.b),
        demandC: Number(values.c),
        minPrice: Number(values.min),
        maxPrice: Number(values.max),
        costPerUnit: Number(values.cost),
      };
      const res = await fetch("/api/v1/lead-magnet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(inputs),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "No se pudo calcular el escenario."
        );
        setResult(null);
        return;
      }
      setResult(data as LeadMagnetResult);
    } catch {
      setError("No se pudo conectar");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrado = async (lead: LeadInputSchema) => {
    setModalAbierto(false);
    if (!result) return;
    const outcome = result.outcomes[0];
    if (!outcome) return;
    try {
      await generarInformePdf({
        lead: {
          nombre: lead.nombre,
          empresa: lead.empresa,
          whatsapp: lead.whatsapp,
          email: lead.email,
        },
        outcome,
        coeficientes: {
          demandA: Number(values.a),
          demandB: Number(values.b),
          demandC: Number(values.c),
          minPrice: Number(values.min),
          maxPrice: Number(values.max),
          costPerUnit: Number(values.cost),
        },
      });
      setMensajeExito(`Informe generado. Te contactamos a ${lead.email} en breve.`);
    } catch {
      setMensajeExito("Tu contacto se registró, pero no se pudo generar el PDF.");
    }
  };

  const outcome = result?.outcomes[0] ?? null;

  // Mapear curva {x,y}[] → labels/datos para ProfitChart
  const chartLabels = result?.curva.map((pt) => pt.x) ?? [];
  const chartDatos = result?.curva.map((pt) => pt.y) ?? [];

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Simulador de precios</h2>
          <div className="mt-4 space-y-4">
            {CAMPOS.map((campo) => (
              <div key={campo.key}>
                <label
                  htmlFor={`field-${campo.testid}`}
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  {campo.label}
                </label>
                <input
                  id={`field-${campo.testid}`}
                  data-testid={campo.testid}
                  type="number"
                  inputMode="decimal"
                  placeholder={campo.placeholder}
                  value={values[campo.key] ?? ""}
                  onChange={(e) => handleChange(campo.key, e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                />
              </div>
            ))}
          </div>
          {error && (
            <p
              role="alert"
              data-testid="lm-error"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            data-testid="lm-calc"
            disabled={isLoading}
            onClick={() => void handleCalculate()}
            className="mt-5 w-full rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Calculando..." : "Calcular escenario"}
          </button>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Tu escenario en números</h2>
          {!outcome ? (
            <p data-testid="lm-empty" className="py-8 text-center text-sm text-zinc-500">
              Ajustá los parámetros para ver tu escenario inicial.
            </p>
          ) : (
            <div className="mt-4">
              {/* Rango honesto */}
              <div className="rounded-lg bg-zinc-50 p-4">
                <span className="text-sm text-zinc-500">Rango de precio sugerido</span>
                <strong data-testid="lm-range" className="mt-1 block text-2xl text-zinc-900">
                  ${outcome.range[0]} – ${outcome.range[1]}
                </strong>
              </div>

              {/* Acción */}
              <div className="mt-4 rounded-lg border-l-4 border-zinc-300 bg-blue-50 p-4">
                <span className="text-sm font-semibold text-zinc-900">Acción recomendada</span>
                <p data-testid="lm-action" className="mt-1 text-sm text-zinc-600">{outcome.action}</p>
              </div>

              {/* Driver, Confidence, Access */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <span className="text-zinc-500">Driver</span>
                  <p data-testid="lm-driver" className="mt-0.5 font-medium text-zinc-800">{outcome.driver}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <span className="text-zinc-500">Confianza</span>
                  <p data-testid="lm-confidence" className="mt-0.5 font-medium text-zinc-800">{outcome.confidence}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <span className="text-zinc-500">Acceso</span>
                  <p data-testid="lm-access" className="mt-0.5 font-medium text-zinc-800">{outcome.access}</p>
                </div>
              </div>

              <div className="mt-5">
                <ProfitChart
                  labels={chartLabels}
                  datos={chartDatos}
                />
              </div>

              <button
                type="button"
                data-testid="lm-download"
                onClick={() => setModalAbierto(true)}
                className="mt-5 w-full rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700"
              >
                Descargar Informe Personalizado en PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {mensajeExito && (
        <p
          role="status"
          data-testid="lm-success"
          className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-700"
        >
          {mensajeExito}
        </p>
      )}

      {modalAbierto && (
        <LeadModal onClose={() => setModalAbierto(false)} onRegistrado={handleRegistrado} />
      )}
    </div>
  );
}
