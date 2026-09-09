/**
 * metrix · domain/shared/outcome.ts
 * Dominio puro: tipo compartido "Resultado Honesto" y builder con validación.
 * OBJ-2: honestidad antes que precisión — toda salida incluye range + driver + action + confidence.
 *
 * Decisión de diseño (ROADMAP §Fase 2):
 *   id = sha256Hex(canonicalJson({ range, driver: trimmed, action: trimmed, confidence }))
 *   usando los helpers existentes hash.ts y canonicalJson.ts.
 *   Driver y action se trimmean ANTES de hashear para que "  X  " y "X" produzcan el mismo id.
 */

import { sha256Hex } from "./hash";
import { canonicalJson } from "./canonicalJson";

// ---------- Tipo público ----------

export interface Outcome {
  id: string;
  range: [number, number];
  driver: string;
  action: string;
  confidence: "baja" | "media" | "alta";
}

export type Confidence = Outcome["confidence"];

// ---------- Error de dominio ----------

const VALID_CONFIDENCES: readonly Confidence[] = ["baja", "media", "alta"];

export class OutcomeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutcomeError";
  }
}

// ---------- Builder ----------

/**
 * Construye un Outcome determinista e inmutable.
 *
 * Validaciones (todas lanzan OutcomeError):
 *   - range: tupla [lo, hi] de exactamente 2 números finitos, lo ≤ hi.
 *   - driver / action: no vacíos tras trim.
 *   - confidence: estrictamente "baja" | "media" | "alta" (case-sensitive).
 *
 * Hash:
 *   id = sha256Hex(canonicalJson({ range, driver: trimmed, action: trimmed, confidence }))
 *
 * Determinismo: mismos inputs → mismo id (prueba explícita en outcome.test.ts).
 */
export function buildOutcome(args: {
  range: [number, number];
  driver: string;
  action: string;
  confidence: Confidence;
}): Outcome {
  const { range, driver, action, confidence } = args;

  // --- Validación range ---
  if (!Array.isArray(range) || range.length !== 2) {
    throw new OutcomeError("range debe ser una tupla de 2 elementos");
  }
  const [lo, hi] = range;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    throw new OutcomeError("range debe contener números finitos");
  }
  if (lo > hi) {
    throw new OutcomeError("range min no puede ser mayor que max");
  }

  // --- Validación driver / action (trim primero) ---
  const trimmedDriver = driver.trim();
  const trimmedAction = action.trim();
  if (trimmedDriver.length === 0) {
    throw new OutcomeError("driver no puede estar vacío");
  }
  if (trimmedAction.length === 0) {
    throw new OutcomeError("action no puede estar vacía");
  }

  // --- Validación confidence (case-sensitive) ---
  if (!VALID_CONFIDENCES.includes(confidence)) {
    throw new OutcomeError("confidence debe ser 'baja', 'media' o 'alta'");
  }

  // --- Hash determinista (trimmed values entran al hash) ---
  const payload = { range, driver: trimmedDriver, action: trimmedAction, confidence };
  const id = sha256Hex(canonicalJson(payload));

  return {
    id,
    range,
    driver: trimmedDriver,
    action: trimmedAction,
    confidence,
  };
}
