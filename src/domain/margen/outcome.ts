/**
 * metrix · domain/margen/outcome.ts
 * Adaptador Fase 2: traduce MargenResult + MargenInputs → Outcome[] honesto.
 * Dominio PURO: sin imports de framework (ni @/lib ni rutas de app).
 *
 * === Decisiones de diseño documentadas ===
 *
 * 1. range: [m − e, m + e] con e = max(|m| × 0.01, 0.5)
 *    - El 1 % del |margen| es la incertidumbre inherente a la fórmula v1
 *      (los inputs vienen del usuario, no de medición real).
 *    - El mínimo 0.5 evita intervalos puntualmente degenerados cuando el
 *      margen es cercano a cero.
 *    - Amplitud: 2e. Se cumple 2e < |m| + 5 para todo m finito (verificado
 *      aritméticamente: si |m|≥50 → 0.02|m| < |m|+5; si |m|<50 → 1 < |m|+5).
 *
 * 2. driver: peso absoluto mayor entre
 *      { comisionAbs, mermaAbs, ivaAbs, fleteUnitario, costoUnitario }.
 *    Desempate determinístico (primero en orden gana empate):
 *      comisión > merma > IVA > flete > costo
 *    Justificación: en orden decreciente de impacto sobre el ingreso neto
 *      (comisión/merma/IVA son % sobre venta → mayor volatilidad; flete y
 *      costo son absolutos → más predecibles).
 *
 * 3. action: mapeo fijo driver→acción en castellano:
 *      comisión por venta → "renegociar comisión"
 *      merma              → "reducir merma"
 *      IVA sobre venta    → "subir precio de venta"
 *      flete por unidad   → "revisar flete"
 *      costo unitario     → "bajar costo de adquisición"
 *    Todos son verbos concretos; ninguno arranca con número.
 *
 * 4. confidence: siempre "alta"
 *    Heurística: en Fases 1–4 los drivers de margen vienen 100 % del input
 *    del usuario. La infraestructura de medición real llega post-Fase 4
 *    (ROADMAP §Fase 5). Cuando exista medición, confidence será dinámico.
 */

import type { Outcome } from "../shared/outcome";
import { buildOutcome, OutcomeError } from "../shared/outcome";
import type { MargenResult, MargenInputs } from "./margen";

// ---------- Driver selection ----------

/** Claves de los componentes de costo absoluto, en orden de precedencia de desempate. */
const DRIVER_ORDER = [
  "comisionAbs",
  "mermaAbs",
  "ivaAbs",
  "fleteUnitario",
  "costoUnitario",
] as const;

type DriverKey = (typeof DRIVER_ORDER)[number];

/** Etiquetas en castellano para cada driver ( Outcome.driver ). */
const DRIVER_LABELS: Record<DriverKey, string> = {
  comisionAbs: "comisión por venta",
  mermaAbs: "merma",
  ivaAbs: "IVA sobre venta",
  fleteUnitario: "flete por unidad",
  costoUnitario: "costo unitario",
};

/** Acciones concretas en castellano para cada driver ( Outcome.action ). */
const DRIVER_ACTIONS: Record<DriverKey, string> = {
  comisionAbs: "renegociar comisión",
  mermaAbs: "reducir merma",
  ivaAbs: "subir precio de venta",
  fleteUnitario: "revisar flete",
  costoUnitario: "bajar costo de adquisición",
};

/**
 * Selecciona el driver dominante por peso absoluto.
 * Desempate determinístico: primero en DRIVER_ORDER gana.
 *
 * Pesos:
 *   comisionAbs   = result.comisionAbs   (precioVenta × comisionPct)
 *   mermaAbs      = result.mermaAbs       (precioVenta × mermaPct)
 *   ivaAbs        = result.ivaAbs         (precioVenta × ivaPct)
 *   fleteUnitario = inputs.fleteUnitario  (absoluto)
 *   costoUnitario = inputs.costoUnitario  (absoluto)
 */
function selectDriver(result: MargenResult, inputs: MargenInputs): DriverKey {
  const weights: Record<DriverKey, number> = {
    comisionAbs: Math.abs(result.comisionAbs),
    mermaAbs: Math.abs(result.mermaAbs),
    ivaAbs: Math.abs(result.ivaAbs),
    fleteUnitario: Math.abs(inputs.fleteUnitario),
    costoUnitario: Math.abs(inputs.costoUnitario),
  };

  let bestKey: DriverKey = DRIVER_ORDER[0];
  let bestWeight = weights[bestKey];
  for (const key of DRIVER_ORDER) {
    if (weights[key] > bestWeight) {
      bestKey = key;
      bestWeight = weights[key];
    }
  }
  return bestKey;
}

// ---------- Adaptador público ----------

/**
 * Traduce un resultado de margen en una lista de Outcomes honestos.
 *
 * Garantía: mismo (result, inputs) → mismos outcomes
 * (determinismo transitivo via buildOutcome).
 *
 * NOTA: toMargenOutcomes no lanza con inputs válidos (Zod + calcularMargenReal).
 * buildOutcome podría lanzar OutcomeError si el rango contiene no finitos;
 * por eso hay defensa explícita sobre `m` antes de calcular el range.
 * (OutcomeError se propaga como 400 via handleApiError desde Fase 2 AUDIT.)
 */
export function toMargenOutcomes(
  result: MargenResult,
  inputs: MargenInputs,
): Outcome[] {
  const m = result.margenRealUnitario;
  if (!Number.isFinite(m)) {
    throw new OutcomeError("margenRealUnitario debe ser un número finito");
  }

  // e = max(|m| × 0.01, 0.5) — ver justificación en cabecera
  const e = Math.max(Math.abs(m) * 0.01, 0.5);
  const range: [number, number] = [m - e, m + e];

  const driverKey = selectDriver(result, inputs);

  return [
    buildOutcome({
      range,
      driver: DRIVER_LABELS[driverKey],
      action: DRIVER_ACTIONS[driverKey],
      confidence: "alta",
      access: "free",
    }),
  ];
}
