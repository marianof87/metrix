import type { Metadata } from "next";
import CalculatorForm, { type DynamicGroupDef, type FieldDef } from "@/components/CalculatorForm";

export const metadata: Metadata = {
  title: "Calculadora de ROI · metrix",
  description:
    "Retorno simple y anualizado, NPV, payback e IRR a partir de flujos de caja.",
};

const fields: FieldDef[] = [
  {
    name: "initialInvestment",
    label: "Inversión inicial",
    type: "number",
    required: true,
    placeholder: "Ej. 10000",
    suffix: "$",
    help: "Monto desembolsado en el período 0.",
  },
  {
    name: "finalValue",
    label: "Valor final (opcional)",
    type: "number",
    placeholder: "Ej. 15000",
    suffix: "$",
    help: "Variante simple: valor final de la inversión.",
  },
  {
    name: "periods",
    label: "Períodos (opcional)",
    type: "number",
    placeholder: "Ej. 3",
    help: "Para anualizar el ROI simple. Entero positivo.",
  },
  {
    name: "discountRatePct",
    label: "Tasa de descuento (opcional)",
    type: "number",
    placeholder: "Ej. 8",
    help: "Para el NPV. Se ingresa en porcentaje (8 = 8%).",
  },
];

const cashFlowsGroup: DynamicGroupDef = {
  name: "cashFlows",
  label: "Flujos de caja",
  fields: [
    {
      name: "period",
      label: "Período",
      type: "number",
      placeholder: "Ej. 1",
      help: "Período del flujo (entero positivo).",
    },
    {
      name: "amount",
      label: "Monto",
      type: "number",
      placeholder: "Ej. 4000",
      suffix: "$",
    },
  ],
  addLabel: "Añadir flujo",
  removeLabel: "Quitar",
};

export default function RoiPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Calculadora de ROI</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Retorno sobre la inversión: variante simple (valor final) o por flujos de
        caja (payback, NPV e IRR).
      </p>
      <div className="mt-6">
        <CalculatorForm
          title="Parámetros de inversión"
          fields={fields}
          endpoint="/api/v1/roi"
          module="roi"
          dynamicGroups={[cashFlowsGroup]}
        />
      </div>
    </div>
  );
}