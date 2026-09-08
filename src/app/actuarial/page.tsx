import type { Metadata } from "next";
import CalculatorForm, { type FieldDef } from "@/components/CalculatorForm";

export const metadata: Metadata = {
  title: "Actuario · metrix",
  description:
    "Interés compuesto, anualidades, valor presente y tasa efectiva anual.",
};

const fields: FieldDef[] = [
  {
    name: "principal",
    label: "Capital inicial",
    type: "number",
    required: true,
    placeholder: "Ej. 1000",
    suffix: "$",
  },
  {
    name: "annualRatePct",
    label: "Tasa nominal anual",
    type: "number",
    required: true,
    placeholder: "Ej. 5",
    help: "Se ingresa en porcentaje (5 = 5%).",
  },
  {
    name: "periodsPerYear",
    label: "Períodos por año",
    type: "number",
    required: true,
    placeholder: "Ej. 12",
    help: "Frecuencia de capitalización (1, 2, 4, 12…).",
  },
  {
    name: "years",
    label: "Años",
    type: "number",
    required: true,
    placeholder: "Ej. 10",
  },
  {
    name: "contributionPerPeriod",
    label: "Aporte por período (opcional)",
    type: "number",
    placeholder: "Ej. 100",
    suffix: "$",
    help: "Aporte periódico al final de cada período para la anualidad.",
  },
];

export default function ActuarialPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Actuario</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Interés compuesto, anualidades, tasa efectiva anual y valor presente con
        descuento.
      </p>
      <div className="mt-6">
        <CalculatorForm
          title="Parámetros actuariales"
          fields={fields}
          endpoint="/api/v1/actuarial"
          module="actuarial"
        />
      </div>
    </div>
  );
}