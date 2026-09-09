# SPEC FASE 1 · T1 — dominio `margen` (MVP-1 de Metrix AI)

> Fuente: `docs/ROADMAP_REFUNDACION_METRIX_AI.md` · Fase 1.
> Gate 0 cumplido: `HUMAN-WEEXPECT.md` firmado (rows=13, signed-at=2026-08-11, commit `494c717`).

## Objetivo

Que el dueño vea **si un producto le deja plata o la saca** con "lo que tengo en la factura":
costo, comisión, merma, flete, IVA y precio de lista. Dominio puro, sin framework.

## Alcance de esta spec (Fase 1)

1. Dominio puro `src/domain/margen/margen.ts` (fórmula v1: `margen-v1`).
2. Tests unitarios rojos (archivo `src/domain/margen/margen.test.ts`).
3. Contrato API `POST /api/v1/margen` + schema Zod `margenInputSchema` (Fase 4 del roadmap lo
   evolverá al formato `Outcome` de OBJ-2; acá el shape es determinístico con señales de honestidad).

Fuera de alcance de esta spec: UI, PDF, gabinete de administración, E2E (fases posteriores).

## Modelo de dominio

### Inputs `MargenInputs`

| Campo | Tipo | Regla |
|---|---|---|
| `precioVenta` | number | finito, **> 0** |
| `comisionPct` | number | [0, 1) — % sobre venta (plataforma/marketplace) |
| `mermaPct` | number | [0, 1) — % sobre venta (merma) |
| `fleteUnitario` | number | ≥ 0 |
| `ivaPct` | number | [0, 1) — IVA sobre venta (se detrae del ingreso) |
| `costoUnitario` | number | ≥ 0 |
| `costosFijosMensuales?` | number | ≥ 0; si se pasa, se computa punto de equilibrio |
| `fechaDesde?` | string? | passthrough para traslado de suba (no valida formato en Fase 1) |

Regla dura de coherente: `comisionPct + mermaPct + ivaPct < 1`. Si `≥ 1`, es inválido como input
(no existe precio que pague las tasas) → error de dominio `MargenDomainError` (mensaje claro).

### Outputs `MargenResult`

| Campo | Tipo | Fórmula / nota |
|---|---|---|
| `formulaVersion` | string | `"margen-v1"` |
| `precioVenta` | number | eco del input |
| `comisionAbs` | number | `precioVenta × comisionPct` |
| `mermaAbs` | number | `precioVenta × mermaPct` |
| `ivaAbs` | number | `precioVenta × ivaPct` |
| `fleteUnitario` | number | eco del input |
| `costoUnitario` | number | eco del input |
| `ingresoNetoUnitario` | number | `precioVenta − comisionAbs − mermaAbs − flete − ivaAbs` |
| `margenRealUnitario` | number | `ingresoNetoUnitario − costoUnitario` |
| `margenPct` | number | `margenRealUnitario / precioVenta` |
| `puedeCubrirCostos` | boolean | `margenRealUnitario > 0` — señal honesta de "te deja plata o te la saca" |
| `puntoEquilibrioUnidades?` | number | `costosFijosMensuales / margenRealUnitario` solo si `costosFijosMensuales` pasado y margen > 0 |
| `equilibrioAlcanzable?` | boolean | false si margen ≤ 0 con costos fijos pasados (no existe equilibrio a ese precio) |
| `pisoPrecioSku` | number \| null | precio con margen = 0: `(costoUnitario + flete) / (1 − (comision+merma+iva))` si denominador > 0; si no, `null` |
| `pisoPrecioSkuAviso?` | string | cuando piso es null: "Con estas tasas no existe un piso de precio finito" |
| `redondeo` | number | aplicar `round` de `domain/shared/decimal` a los monetarios |

### Función adicional `calcularTrasladoSuba(TrasladoInputs): TrasladoResult`

Traslado de una suba del proveedor manteniendo el margen absoluto actual.

`TrasladoInputs`: `precioVentaActual`, `costoAnteriorUnitario`, `costoNuevoUnitario`, más las mismas
tasas (`comisionPct`, `mermaPct`, `ivaPct`, `fleteUnitario`); `fechaDesde?` passthrough.

`TrasladoResult`:
| Campo | Fórmula |
|---|---|
| `formulaVersion` | `"margen-v1"` |
| `margenAbsActual` | `ingresoNeto(precioVentaActual) − costoAnterior` |
| `precioVentaNuevo` | el precio que mantiene `margenAbsActual` con el costo nuevo: `(costoNuevo + margenAbsActual + flete)/(1 − tasas)` |
| `deltaPrecioAbs` | `precioVentaNuevo − precioVentaActual` |
| `deltaPrecioPct` | `deltaPrecioAbs / precioVentaActual` |
| `fechaDesde?` | passthrough |

## Errores de dominio

`MargenDomainError` (name `"MargenDomainError"`) con mensajes claros en castellano:
- "precioVenta debe ser un número finito mayor que 0"
- "comisionPct/mermaPct/ivaPct deben estar en [0, 1)"
- "costoUnitario/fleteUnitario/costosFijosMensuales deben ser ≥ 0"
- "la suma de comisionPct + mermaPct + ivaPct debe ser menor que 1"
- Traslado: "costoNuevoUnitario debe ser ≥ 0", "precioVentaActual debe ser > 0"

## Contrato API `POST /api/v1/margen`

- 200: `MargenResult` (JSON).
- 400: Zod flatten con `jsonError("Invalid input", 400, ...)`.
- Handler estilo `lead-magnet/route.ts` (NextResponse + `readJsonBody` + `handleApiError`).
- Schema `margenInputSchema` en `src/lib/validation.ts` con las mismas reglas (refine de tasas < 1).
- Contrato OpenAPI: agregar `margen` en `src/app/api/v1/openapi/openapi.json` (trigger opcional de Fase 1).

## Criterios de aceptación (AC)

1. `src/domain/margen/margen.ts` exporta `MargenInputs`, `MargenResult`, `TrasladoInputs`,
   `TrasladoResult`, `calcularMargenReal`, `calcularTrasladoSuba`, `MargenDomainError`,
   `MARGEN_FORMULA_VERSION = "margen-v1"`.
2. `calcularMargenReal` cubre: caso simple sin tasas (margen = precio − costo), con comisión, con
   merma+flete, con IVA, margen negativo → `puedeCubrirCostos: false`, borde tasas ≥ 1 → error.
3. Punto de equilibrio: con costos fijos → unidades; con margen ≤ 0 → `equilibrioAlcanzable: false`
   y `puntoEquilibrioUnidades` ausente.
4. `pisoPrecioSku` correcto; denominador ≤ 0 → `null` + `pisoPrecioSkuAviso`.
5. `calcularTrasladoSuba` mantiene el margen absoluto y devuelve deltaAbs/deltaPct.
6. Suite Vitest del dominio: **tests rojos primero** (diseñados por `test-writer`, materializados acá),
   luego verdes. Al menos 12 asserts de dominio + 3 de contrato API (200/400 Zod).
7. `npm run typecheck` y `npm run lint` sin errores nuevos; suite general sin regresiones
   (los 2 tests ya conocidos fallando de escenarios/lead-magnet se tratan como deuda aparte,
   salvo que esta spec los toque — no los toca).

## Orden de ejecución (protocolo Commitar)

1. VERIFY/RED: `test-writer` diseña tests rojos (solo reporta).
2. Materializar `src/domain/margen/margen.test.ts` + `src/app/api/v1/api.margen.test.ts` (contrato).
3. IMPLEMENT/GREEN: implementación del dominio + schema + route hasta verde.
4. AUDIT: `code-reviewer` sobre la diff.
5. RELEASE: suite completa, docs (README suma `margen`), contadores actualizados.