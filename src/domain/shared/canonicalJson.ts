/**
 * metrix · domain/shared/canonicalJson.ts
 * Serialización canónica de JSON para hashes deterministas de entrada.
 * Dominio PURO: sin imports de framework.
 *
 * Propósito: dos objetos con las mismas claves en distinto orden producen
 * el mismo hash. Ordena claves recursivamente y serializa de forma estable.
 */

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Devuelve una representación JSON canónica (claves ordenadas) de un valor.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value as JsonValue));
}

function sortValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (isPlainObject(value)) {
    const sorted: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortValue(value[key]);
    }
    return sorted;
  }
  return value;
}
