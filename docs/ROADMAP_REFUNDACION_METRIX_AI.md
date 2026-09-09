# Roadmap de re-fundación — `metrix` → Metrix AI

> **Decisión (Opción A):** el repo `metrix` DEVIENE Metrix AI. Se re-funda sobre la visión
> fundacional del dossier `HUMAN-WEEXPECT.md`, no sobre la "suite de simuladores" actual.
> La arquitectura, stack, BD, nombres y métricas los decide el sistema con evidencia;
> **lo irreduciblemente humano lo decide el dossier firmado.**

## Gate 0 — Firma del dossier (bloqueante, humano)

Ninguna fase de producto arranca sin el dossier firmado y depositado.
Ejecutar: `docs/SESION_FIRMA_METRIX_AI.md` (20–40 min).
Entregable: `HUMAN-WEEXPECT.md` (renombrado desde `.md.md`), commit dedicado.
Criterio de aceptación (AC):
- `rows-authored-or-rewritten` ≥ 1 · `attestation` literal · `waived: false`
- Las barras de felt-quality y las demo-scenes quedan **anotadas** (son el eje cualitativo del tablero).

## Estado base del repo (evidencia del 2026-09-09)

| Componente | Estado actual | Destino |
|---|---|---|
| `domain/pricing` (v1) | `baseCost + desiredMarginPct → suggestedPrice` (+tax/discount/quantity) | **Evoluciona** → T1 (margen real por unidad) |
| `domain/leadmagnet` | **Roto**: route importa `optimizarPrecio/buildProfitCurve` que ya no existen (fue sobrescrito por `computeLeadMagnet`/`validateLeadMagnetInputs`) → 500 | **Reparar** → Fase deuda técnica (MVP-2) |
| `domain/{quadratic, roi, actuarial}` | Utilidades de cálculo | **Repliegue/retención**: decisión de producto (ver §Módulos actuales) |
| `scenarios` (service+repo+auditoría, D4/D5) | Infra sólida, 1 test conocido fallando (concurrencia in-memory) | **Se conserva** como infraestructura de escenarios |
| `schema.prisma` | `ScenarioRecord`, `AuditEntry`, `Lead` | **Se extiende** (Fase 3: plan/features) |
| README/docs | Describen "suite de simuladores" | **Se reescribe** al cierre de Fase 1 |

## Fase 1 — T1: margen real por unidad, equilibrio y traslado de suba (`MVP-1`)

Objetivo: que el dueño vea **si un producto le deja plata o le saca**, con su factura a mano.

1. **Dominio puro `domain/margen`** (fórmula v2, TDD rojo→verde):
   - Margen real por unidad = `precioVenta − comisión% − merma% − fleteUnitario − IVA(sobre venta) − costoUnitario`
   - Punto de equilibrio: unidades necesarias para cubrir costos fijos y variables
   - Piso de precio por SKU: precio mínimo que no quiebra (con costos cargados)
   - Traslado de suba del proveedor: cuánto mover el precio y **a partir de cuándo** (fecha/stock)
2. **Contrato API** `POST /api/v1/margen` con esquema Zod (`margenInputSchema`)
3. **Tests de dominio + contrato** (test-writer → red; implementación → green; code-reviewer → AUDIT)
4. **UI mínima**: un formulario que acepte "lo que tengo en la factura" (ver demo-scene del dossier: ≤ N pasos y con ≤ N datos — los números exactos salen del felt-quality firmado)

AC: dominio cubierto (incl. borde comisión/merma ≥ 1, flete negativo, IVA inválido); contrato API con 200/400; la demo-scene del dossier para este rol pasa en ≤ N pasos en E2E.

## Fase 2 — OBJ-2: honestidad antes que precisión (transversal)

Objetivo: **ninguna salida es un número falso con dos decimales; es un intervalo con su causa y una acción.**

1. **Nuevo tipo de salida "Resultado Honesto"** en el dominio compartido:
   ```ts
   interface Outcome {
     id: string;
     range: [number, number];        // intervalo (o estimación puntual con precisión declarada)
     driver: string;                 // la causa principal del resultado
     action: string;                 // una acción concreta, no un dato
     confidence: "baja" | "media" | "alta"; // de dónde sale cada driver
   }
   ```
2. Se aplica a: `margen` (Fase 1) y `lead-magnet` (precio óptimo → rango de precio con causa y acción).
3. Los simuladores actuales (`pricing`, `quadratic`, `roi`, `actuarial`) quedan **bajo el mismo formato** o replegados (decisión §Módulos actuales).
4. El contrato OpenAPI y los tests de contrato se actualizan a `Outcome`.

AC: ningún endpoint v1 de producto devuelve un número suelto sin `range+driver+action`; tests actualizados; README explica OBJ-2.

## Fase 3 — OBJ-1: frontera gratis/pago

Objetivo: **gratis si el dueño aportó todos los números; pago si Metrix aportó uno que él no tenía.**

1. **Regla en dominio**: un resultado se marca `free` si todos sus drivers salen de inputs del usuario; cualquier driver estimado por el sistema (curva, intervalo inferido) marca `paid`-eligible.
2. **Schema Prisma**: `Lead` ya existe (contacto); agregar modelo de plan/entitlement (o campo en Lead, según diseño final).
3. **Flujo MVP-2**: calculadora gratuita → resultado `free` visible → informe PDF con drivers extra → desbloqueo con contacto (ya implementado en forma; requiere la reparación de la Fase deuda).
4. **Los precios y niveles NO los define el sistema** (decisión de Mariano, explicitada en el dossier).

AC: un escenario de pago queda identificable en el contrato (`access: "free" | "contact-gated" | "paid"`) sin implementar el cobro aún; decisión de niveles documentada por Mariano.

## Fase 4 — MVP-2 consolidado: calculadora + informe desbloqueado ✅ COMPLETADA (2026-09)

Objetivo: la puerta de entrada gratuita que ya existe, **funcionando y honesta**.
1. ✅ Reparar bug 500 de `lead-magnet` (reconciliar `leadmagnet.ts` vs route: nombre único de API y exports coherentes; actualizar `api.contract.test.ts`, `validation.ts`, `LeadMagnetForm`, `informePdf`).
2. ✅ PDF del informe con el formato `Outcome` (rango+causa+acción), no decimales falsos.
3. ✅ E2E de la demo-scene del dossier (rol dueño, ≤ N pasos) — 12/12 Playwright verdes.

AC: **suite completa verde (231 Vitest + 12 E2E)**; PDF descargable con un resultado
honesto; bug 500 cerrado. Extra saldado: lock de concurrencia de `scenario.service`
(`getLockKey()` async → clave de Map siempre única; ahora síncrono).

## Fase 5 — MVP-3 (condicionado, postergado)

Curva de demanda **estimada con intervalo de confianza**. Condición del propio dossier: *"solo si se mide bien"*.
- No se diseña infraestructura de medición en Fase 1–4; solo se deja el contrato `Outcome` preparado para recibir `confidence` real.
- Se abre cuando exista data de uso suficiente (decisión con evidencia, no por cronograma).

## §Módulos actuales — decisión de producto (Mariano), no del sistema

| Módulo actual | Opciones (elegir en el dossier o en la primera review post-firma) |
|---|---|
| `pricing` | Evolucionar a T1 (recomendado) |
| `lead-magnet` | Conservar como MVP-2 (recomendado) |
| `quadratic`, `roi`, `actuarial` | Replegar a `/lab` (utilidades educativas) o retirar de la v1.0 |
| `scenarios` + auditoría | Conservar como infraestructura (recomendado) |

## Deuda técnica transversal (a saldar en cualquier fase antes de release)

- ✅ SALDADO (Fase 4): bug 500 `lead-magnet` por mismatch de exports → reparado con contrato honesto (`computeLeadMagnet` + `toLeadMagnetOutcome`).
- ✅ SALDADO (Fase 4): lock de concurrencia en `scenario.service` — `getLockKey()` era async y se usaba como clave de Map (objeto Promise siempre único); ahora síncrono.
- ✅ SALDADO (Fase 4): contador de tests/README actualizado → 231 Vitest + 12 E2E, todo verde.

Mejoras menores post-release (hallazgos del AUDIT de Fase 4, no bloquean):
- O-1: sanitizar caracteres fuera de WinAnsi (emoji/CJK) antes de `drawText` en `informePdf.ts` (texto del lead llega al PDF plano; pdf-lib lanza con charset fuera de Helvetica).
- O-2: layout del bloque resultados del PDF si la `action` fuera muy larga (el wrap de `dibujarTexto` podría solaparse con el CTA).

## Metodología por fase (protocolo Commitar)

1. **SPECIFY**: descomposición en tareas atómicas con AC (esta roadmap es la fuente).
2. **VERIFY/RED**: convocar `test-writer` (tests que deben fallar).
3. **IMPLEMENT/GREEN**: especialista implementa contra los tests.
4. **AUDIT**: convocar `code-reviewer` sobre la diff.
5. **REFACTOR / REFRESH / RELEASE**: fases 5-7 bajo responsabilidad del orquestador (limpieza, docs/schemas, verificación final).

## Lo que el sistema NO decide (queda sellado en el dossier)

- Respuestas del dossier (roles, stories, felt-quality, demo-scene) — humanas.
- Propiedad intelectual del material académico (5 autores, sin licencia).
- Precios y niveles del producto (`OBJ-1`).

## Siguiente paso inmediato

Ejecutar `docs/SESION_FIRMA_METRIX_AI.md` (Mariano + un dueño real, 20–40 min).
Al firmar el dossier y commitearlo, la Fase 1 (T1) queda habilitada y se convoca a `test-writer`.