import type { Metadata } from "next";
import CalculatorForm from "@/components/CalculatorForm";
import type { FieldDef } from "@/components/CalculatorForm";

export const metadata: Metadata = {
  title: "Calculadora cuadrática · metrix",
  description:
    "Resuelve f(x) = ax² + bx + c: raíces, vértice, concavidad y tabla de valores.",
};

const fields: FieldDef[] = [
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

export default function QuadraticPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Calculadora cuadrática</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Resuelve f(x) = ax² + bx + c: discriminante, raíces, vértice, eje de
        simetría y tabla de valores opcional.
      </p>
      <div className="mt-6">
        <CalculatorForm
          title="Parámetros"
          fields={fields}
          endpoint="/api/v1/quadratic"
          module="quadratic"
        />
      </div>
    </div>
  );
}