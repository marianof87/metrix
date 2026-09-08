"use client";

/**
 * metrix · components/QuadraticPageView.tsx
 * Vista de la calculadora cuadrática: eleva el estado de los coeficientes para
 * renderizar el gráfico cartesiano en vivo junto al formulario existente.
 */

import { useState } from "react";
import CalculatorForm, { type FieldDef } from "./CalculatorForm";
import QuadraticChart from "./QuadraticChart";

const FIELDS: FieldDef[] = [
  {
    name: "a",
    label: "Coeficiente a",
    type: "number",
    required: true,
    placeholder: "Ej. 1",
    help: "Debe ser distinto de cero.",
  },
  {
    name: "b",
    label: "Coeficiente b",
    type: "number",
    required: true,
    placeholder: "Ej. -3",
  },
  {
    name: "c",
    label: "Coeficiente c",
    type: "number",
    required: true,
    placeholder: "Ej. 2",
  },
  {
    name: "sampleStart",
    label: "Inicio de muestra (opcional)",
    type: "number",
    placeholder: "Ej. -2",
    help: "Valor inicial de x para la tabla de valores.",
  },
  {
    name: "sampleEnd",
    label: "Fin de muestra (opcional)",
    type: "number",
    placeholder: "Ej. 2",
    help: "Valor final de x para la tabla de valores.",
  },
  {
    name: "sampleStep",
    label: "Paso de muestra (opcional)",
    type: "number",
    placeholder: "Ej. 0.5",
    help: "Incremento entre valores de x (debe ser positivo).",
  },
];

interface Coeffs {
  a: number | null;
  b: number | null;
  c: number | null;
}

function parseCoeff(raw: string): number | null {
  if (raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export default function QuadraticPageView() {
  const [coeffs, setCoeffs] = useState<Coeffs>({ a: null, b: null, c: null });

  const handleValuesChange = (values: Record<string, string>) => {
    setCoeffs({
      a: parseCoeff(values["a"] ?? ""),
      b: parseCoeff(values["b"] ?? ""),
      c: parseCoeff(values["c"] ?? ""),
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Calculadora cuadrática</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Resuelve f(x) = ax² + bx + c: discriminante, raíces, vértice, eje de
        simetría y tabla de valores opcional.
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <CalculatorForm
            title="Parámetros"
            fields={FIELDS}
            endpoint="/api/v1/quadratic"
            module="quadratic"
            onValuesChange={handleValuesChange}
          />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
          <h2 className="text-lg font-semibold">Gráfico Cartesiano</h2>
          <div className="mt-4">
            <QuadraticChart a={coeffs.a} b={coeffs.b} c={coeffs.c} />
          </div>
        </div>
      </div>
    </div>
  );
}