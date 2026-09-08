/**
 * metrix · domain/shared/hash.ts
 * Wrapper SHA-256 para hashes deterministas (inputHash de escenarios).
 * Dominio PURO: usa solo la Web Crypto API (disponible en Node 15+).
 */

import { createHash } from "crypto";

/**
 * Calcula el hash SHA-256 (hex) de una cadena.
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
