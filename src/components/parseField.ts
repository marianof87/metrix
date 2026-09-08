/**
 * metrix · components/parseField.ts
 * Conversión de strings de input de formulario → números.
 *
 * Campos que se ingresan en PORCENTAJE (%): el usuario escribe 30 para "30%"
 * y acá se convierten a tanto por uno (0.30) antes de enviar a la API.
 * El resto de campos numéricos se convierten con Number(value).
 */

/** Campos que representan una tasa en porcentaje (se ingresan como % y se van a tanto por uno). */
export const PERCENT_FIELDS = new Set<string>([
  "desiredMarginPct", // pricing: margen objetivo
  "taxPct", // pricing: impuesto
  "discountPct", // pricing: descuento
  "discountRatePct", // roi: tasa de descuento (NPV)
  "annualRatePct", // actuarial: tasa nominal anual
]);

/**
 * Convierte la cadena de un input a number (o undefined si está vacío).
 * - Campos en PERCENT_FIELDS: value / 100 (tanto por uno).
 * - Resto numérico: Number(value).
 * - Si el texto no es un número válido devuelve undefined (para que el validador
 *   Zod reporte el error correspondiente bajo el campo).
 */
export function parseField(name: string, value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  const num = Number(trimmed);
  if (Number.isNaN(num)) {
    return undefined;
  }
  if (PERCENT_FIELDS.has(name)) {
    return num / 100;
  }
  return num;
}

/**
 * Indica si un campo se interpreta como porcentaje y debe mostrarse con sufijo "%".
 */
export function isPercentField(name: string): boolean {
  return PERCENT_FIELDS.has(name);
}
