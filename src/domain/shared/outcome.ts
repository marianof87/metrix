/**
 * metrix · domain/shared/outcome.ts
 * Dominio puro: tipo compartido "Resultado Honesto" y builder con validación.
 * OBJ-2: honestidad antes que precisión — toda salida incluye range + driver + action + confidence + access.
 *
 * OBJ-1 (ROADMAP §Fase 3): frontera gratis/pago.
 *   access entra al hash determinista → mismo contenido con access distinto → id distinto.
 *
 * Decisión de diseño (ROADMAP §Fase 2):
 *   id = sha256Hex(canonicalJson({ range, driver: trimmed, action: trimmed, confidence, access }))
 *   usando los helpers existentes hash.ts y canonicalJson.ts.
 *   Driver y action se trimmean ANTES de hashear para que "  X  " y "X" produzcan el mismo id.
 */

import { sha256Hex } from "./hash";
import { canonicalJson } from "./canonicalJson";

// ---------- Tipo público ----------

/** Tipo de desbloqueo (OBJ-1): gratis si el dueño aportó todos los números; contact-gated si se desbloquea con contacto; pago si Metrix aportó uno que él no tenía. */
export type Access = "free" | "contact-gated" | "paid";

export interface Outcome {
  id: string;
  range: [number, number];
  driver: string;
  action: string;
  confidence: "baja" | "media" | "alta";
  access: Access;
}

export type Confidence = Outcome["confidence"];

// ---------- Error de dominio ----------

const VALID_CONFIDENCES: readonly Confidence[] = ["baja", "media", "alta"];
const VALID_ACCESSES: readonly Access[] = ["free", "contact-gated", "paid"];

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
 *   - access: estrictamente "free" | "contact-gated" | "paid" (case-sensitive).
 *
 * Hash:
 *   id = sha256Hex(canonicalJson({ range, driver: trimmed, action: trimmed, confidence, access }))
 *
 * Determinismo: mismos inputs → mismo id (prueba explícita en outcome.test.ts).
 */
export function buildOutcome(args: {
  range: [number, number];
  driver: string;
  action: string;
  confidence: Confidence;
  access: Access;
}): Outcome {
  const { range, driver, action, confidence, access } = args;

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

  // --- Validación access (case-sensitive) ---
  if (!VALID_ACCESSES.includes(access)) {
    throw new OutcomeError("access debe ser 'free', 'contact-gated' o 'paid'");
  }

  // --- Hash determinista (trimmed values + access entran al hash) ---
  const payload = { range, driver: trimmedDriver, action: trimmedAction, confidence, access };
  const id = sha256Hex(canonicalJson(payload));

  return {
    id,
    range,
    driver: trimmedDriver,
    action: trimmedAction,
    confidence,
    access,
  };
}

// ---------- Helper: frontera gratis/pago (OBJ-1) ----------

/**
 * Determina el nivel de acceso (OBJ-1) a partir de las fuentes de datos.
 *
 * Regla:
 *   systemEstimatedDriver=false, gatedByContact=false → "free"
 *     (todos los números provienen del dueño).
 *   systemEstimatedDriver=true,  gatedByContact=true  → "contact-gated"
 *     (driver estimado por sistema, pero se desbloquea con contacto).
 *   systemEstimatedDriver=true,  gatedByContact=false → "paid"
 *     (Metrix aportó un dato que el dueño no tenía).
 *   systemEstimatedDriver=false, gatedByContact=true  → incoherente
 *     (no puede haber gating por contacto si el sistema no estimó nada).
 */
export function accessFromSources(sources: {
  systemEstimatedDriver: boolean;
  gatedByContact: boolean;
}): Access {
  const { systemEstimatedDriver, gatedByContact } = sources;

  if (!systemEstimatedDriver && gatedByContact) {
    throw new OutcomeError(
      "accessFromSources: gatedByContact sin driver estimado por el sistema es incoherente",
    );
  }

  if (!systemEstimatedDriver) return "free";
  if (gatedByContact) return "contact-gated";
  return "paid";
}
