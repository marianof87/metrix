/**
 * metrix · domain/leadmagnet/outcome.ts
 * Adaptador Fase 2: traduce LeadMagnetResult + LeadMagnetInputs → Outcome | null.
 * Dominio PURO: sin imports de framework (ni @/lib ni rutas de app).
 *
 * === Decisiones de diseño documentadas ===
 *
 * 1. null-safe: si result es null (inputs inválidos), retorna null sin lanzar.
 *
 * 2. range: [conservative.price, aggressive.price] recortado a [minPrice, maxPrice].
 *    Contiene optimalPrice por construcción (conservative ≤ optimal ≤ aggressive
 *    tras clamp, porque conservative = optimal × 0.9 y aggressive = optimal × 1.1).
 *
 * 3. driver: "curvatura de la demanda"
 *    La demanda es estimada por el sistema (no input directo del usuario), por eso
 *    la confidence NUNCA es "alta" (ver punto 4).
 *
 * 4. action: "fijar precio de lanzamiento en <N> y monitorear demanda"
 *    donde N = Math.round(optimalPrice). Verbo concreto orientado a decisión.
 *
 * 5. confidence: NUNCA "alta" — la demanda es estimada por el sistema, no medida.
 *    Heurística determinística:
 *      "media" si optimalQuantity > 0 (hay demanda estimada positiva al precio óptimo)
 *      "baja"  si optimalQuantity === 0 (no hay demanda estimada viable)
 *    Nota: la infraestructura de medición real llega post-Fase 4 (ROADMAP §Fase 5).
 *
 * 6. No expone optimalPrice / maxProfit como campos sueltos del Outcome.
 */

import type { Outcome } from "../shared/outcome";
import { buildOutcome } from "../shared/outcome";
import type { LeadMagnetResult, LeadMagnetInputs } from "./leadmagnet";

/**
 * Traduce un resultado lead magnet en un Outcome honesto, o null si result es null.
 *
 * Garantía: mismo (result, inputs) → mismo outcome (determinismo via buildOutcome).
 */
export function toLeadMagnetOutcome(
  result: LeadMagnetResult | null,
  inputs: LeadMagnetInputs,
): Outcome | null {
  if (!result) return null;

  // range: [conservative.price, aggressive.price] dentro de [minPrice, maxPrice]
  const lo = Math.max(result.scenarios.conservative.price, inputs.minPrice);
  const hi = Math.min(result.scenarios.aggressive.price, inputs.maxPrice);
  const range: [number, number] = [lo, hi];

  // confidence: "media" si hay demanda positiva estimada, "baja" si no
  const confidence: Outcome["confidence"] =
    result.optimalQuantity > 0 ? "media" : "baja";

  return buildOutcome({
    range,
    driver: "curvatura de la demanda",
    action: `fijar precio de lanzamiento en ${Math.round(result.optimalPrice)} y monitorear demanda`,
    confidence,
  });
}
