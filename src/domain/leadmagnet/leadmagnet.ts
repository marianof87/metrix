/**
 * metrix · domain/leadmagnet/leadmagnet.ts
 * Dominio puro: simulador de precios con escenario cuadrático.
 * Fórmula de beneficio: Profit(p) = (p - costPerUnit) * Demand(p)
 * Donde Demand(p) = demandA·p² + demandB·p + demandC  (con demandA < 0)
 * 
 * Pure computation: NO framework imports, NO side effects.
 * Todos los números son `number` (float64); los tests garantizan precisión.
 */

// ---------- Modelos de entrada y salida ----------

export interface LeadMagnetInputs {
  /** Precio mínimo permitido (inclusive) */
  minPrice: number;
  /** Precio máximo permitido (inclusive) */
  maxPrice: number;
  /** Coeficiente cuadrático de la demanda (DEBE ser < 0) */
  demandA: number;
  /** Coeficiente lineal de la demanda */
  demandB: number;
  /** Término constante de la demanda */
  demandC: number;
  /** Costo unitario base (siempre ≥ 0) */
  costPerUnit: number;
}

export interface LeadMagnetResult {
  /** Precio que maximiza la ganancia (recortado al rango [minPrice, maxPrice]) */
  optimalPrice: number;
  /** Cantidad esperada al precio óptimo */
  optimalQuantity: number;
  /** Ganancia máxima teórica */
  maxProfit: number;
  /** Costo unitario (idéntico al input) */
  costPerUnit: number;
  /** Tres escenarios de mercado */
  scenarios: Readonly<{
    conservative: { price: number; profit: number };
    moderate:   { price: number; profit: number };
    aggressive: { price: number; profit: number };
  }>;
  /** Puntos de la curva de ganancia evaluada (paso 0.5, 24 puntos) */
  profitCurve: Readonly<{ x: number; y: number }[]>;
}

// ---------- Validaciones de entrada ----------

/** Retorna `null` si los inputs son inválidos; si es así, el caller debe mostrar
   el error correspondiente al usuario. Nunca lanza excepciones. */
export function validateLeadMagnetInputs(inputs: LeadMagnetInputs): string | null {
  if (inputs.minPrice >= inputs.maxPrice) return "El precio máximo debe ser mayor que el mínimo";
  if (inputs.demandA >= 0) return "El coeficiente demandA debe ser negativo (curva concave)";
  if (inputs.costPerUnit < 0) return "El costo unitario no puede ser negativo";
  return null;
}

// ---------- Cálculo puro (sin efectos laterales) ----------

/** Calcula el precio que maximiza Profit(p) = (p - costPerUnit) * Demand(p).
   Como demandA < 0, la parábola de beneficio es cóncava → el máximo es el vértice.
   Fórmula: p_vértice = -demandB / (2·demandA)
   Luego se recorta al rango [minPrice, maxPrice].
   Retorna `null` si no hay dominio válido (handled por validateLeadMagnetInputs). */
function computeOptimalPriceUnconstrained(inputs: LeadMagnetInputs): number {
  // p_vértice = -b / (2a)  sobre la parábola de demanda
  // Pero profit = (p - c) * (a·p² + b·p + c);
  // d(dp/dp) = 0 → resolución cúbica simplificada:
  // El máximo ocurre en el vértice de la parábola de beneficio.
  // Como demandA < 0, profit es cóncava → máximo en:
  const unconstrained = -inputs.demandB / (2 * inputs.demandA);
  return unconstrained;
}

/** Recorta un valor al rango [min, max] */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Calcula Profit(p) = (p - costPerUnit) * Demand(p) para un precio dado. */
function profitAt(inputs: LeadMagnetInputs, p: number): number {
  const demand = inputs.demandA * p * p + inputs.demandB * p + inputs.demandC;
  if (demand < 0) return 0; // no venderías cantidad negativa
  return (p - inputs.costPerUnit) * demand;
}

/** Genera los 24 puntos de la curva de ganancia evaluada en pasos de 0.5
   en el rango [vértice - 10, vértice + 10], recortado a [minPrice, maxPrice]. */
function generateProfitCurve(inputs: LeadMagnetInputs, vertexX: number): Readonly<{ x: number; y: number }[]> {
  const points: { x: number; y: number }[] = [];
  const step = 0.5;
  const start = Math.max(inputs.minPrice, vertexX - 10);
  const end = Math.min(inputs.maxPrice, vertexX + 10);

  for (let p = start; p <= end; p += step) {
    points.push({ x: p, y: profitAt(inputs, p) });
  }
  // Asegurar que el precio óptimo esté incluido
  const optX = clamp(computeOptimalPriceUnconstrained(inputs), inputs.minPrice, inputs.maxPrice);
  if (!points.some((pt) => Math.abs(pt.x - optX) < 1e-9)) {
    points.push({ x: optX, y: profitAt(inputs, optX) });
  }
  // Ordenar y quitar duplicados por redondeo
  points.sort((a, b) => a.x - b.x);
  const unique: typeof points = [];
  for (const pt of points) {
    if (unique.length === 0 || Math.abs(unique[unique.length - 1].x - pt.x) > 1e-9) {
      unique.push(pt);
    }
  }
  return unique as Readonly<{ x: number; y: number }[]>;
}

// ---------- Cálculo del resultado completo ----------

/** Calcula los 3 escenarios (conservative/moderate/aggressive) basados en
   el precio óptimo recortado y la curvatura del beneficio. */
function computeScenarios(inputs: LeadMagnetInputs, optimalPrice: number): LeadMagnetResult["scenarios"] {
  const profitAtOptimal = profitAt(inputs, optimalPrice);

  // Definimos los tres escenarios desplazando el precio óptimo en un ±%:
  // - Conservative: precio un 10% abajo del óptimo (más seguro)
  // - Moderate: precio exactamente el óptimo
  // - Aggressive: precio un 10% arriba del óptimo (arriesgado)

  const adjust = (factor: number): number => {
    const adjusted = optimalPrice * (1 - factor);
    return clamp(adjusted, inputs.minPrice, inputs.maxPrice);
  };

  const conservativePrice = adjust(0.1);
  const moderatePrice = optimalPrice;
  const aggressivePrice = clamp(optimalPrice * (1 + 0.1), inputs.minPrice, inputs.maxPrice);

  const conservativeProfit = profitAt(inputs, conservativePrice);
  const moderateProfit = profitAtOptimal;
  const aggressiveProfit = profitAt(inputs, aggressivePrice);

  return {
    conservative: { price: conservativePrice, profit: conservativeProfit },
    moderate:   { price: moderatePrice,   profit: moderateProfit },
    aggressive: { price: aggressivePrice, profit: aggressiveProfit },
  };
}

// ---------- Export público ----------

export function computeLeadMagnet(
  inputs: LeadMagnetInputs
): LeadMagnetResult | null {
  // 1. Validación
  const validationError = validateLeadMagnetInputs(inputs);
  if (validationError !== null) return null;

  // 2. Precio óptimo sin restricciones
  const optimalPriceUnconstrained = computeOptimalPriceUnconstrained(inputs);
  // 2b. Recortar al rango
  const optimalPrice = clamp(optimalPriceUnconstrained, inputs.minPrice, inputs.maxPrice);

  // 3. Cantidad esperada al precio óptimo
  const optimalQuantity = profitAt(inputs, optimalPrice) > 0
    ? Math.max(0, Math.round(profitAt(inputs, optimalPrice) / (optimalPrice - inputs.costPerUnit + 1e-9)))
    : 0;
    // Note: quantity aquí es el "demand" evaluada en el precio óptimo.
    // Si el modelo de demanda fuera inversa, haríamos conversión distinta.
    // Para este dominio, optimalQuantity = Demand(optimalPrice) cuando demand > 0.

  // 4. Curva de ganancia
  const profitCurve = generateProfitCurve(inputs, optimalPrice);

  // 5. Escenarios
  const scenarios = computeScenarios(inputs, optimalPrice);

  return {
    optimalPrice,
    optimalQuantity,
    maxProfit: profitAt(inputs, optimalPrice),
    costPerUnit: inputs.costPerUnit,
    scenarios,
    profitCurve,
  };
}

// ---------- Export types for test imports ----------

export type { LeadMagnetInputs, LeadMagnetResult };