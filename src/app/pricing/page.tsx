import type { Metadata } from "next";
import CalculatorForm, { type FieldDef } from "@/components/CalculatorForm";

export const metadata: Metadata = {
  title: "Simulador de precios · metrix",
  description:
    "Calcule precio sugerido, margen, impuestos, descuentos y totales.",
};

const fields: FieldDef[] = [
  {
    name: "baseCost",
    label: "Costo base",
    type: "number",
    required: true,
    placeholder: "Ej. 100",
    suffix: "$",
  },
  {
    name: "desiredMarginPct",
    label: "Margen deseado",
    type: "number",
    required: true,
    placeholder: "Ej. 30",
    help: "Se ingresa en porcentaje (30 = 30%).",
  },
  {
    name: "taxPct",
    label: "Impuesto (opcional)",
    type: "number",
    placeholder: "Ej. 21",
    help: "Se ingresa en porcentaje (21 = 21%).",
  },
  {
    name: "quantity",
    label: "Cantidad (opcional)",
    type: "number",
    placeholder: "Ej. 10",
    help: "Si se indica, se calculan ingresos y costos totales.",
  },
  {
    name: "discountPct",
    label: "Descuento (opcional)",
    type: "number",
    placeholder: "Ej. 10",
    help: "Se ingresa en porcentaje (10 = 10%).",
  },
  {
    name: "currency",
    label: "Moneda (opcional)",
    type: "text",
    placeholder: "Ej. USD, EUR, ARS",
    help: "Código ISO 4217 para formatear los montos.",
  },
];

export default function PricingPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Simulador de precios</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Calcule el precio sugerido a partir del costo y el margen deseado, con
        impuestos, descuentos y totales opcionales.
      </p>
      <div className="mt-6">
        <CalculatorForm
          title="Parámetros de precio"
          fields={fields}
          endpoint="/api/v1/pricing"
          module="pricing"
        />
      </div>
    </div>
  );
}