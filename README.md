# metrix

Suite de simuladores de negocio: **ecuación cuadrática**, **precios**, **ROI** y
**actuarial**, con historial de escenarios guardados, auditoría inmutable y
re-ejecución con `RE_RUN`.

Stack: Next.js 15 (App Router) · React 19 · TypeScript · Prisma + SQLite ·
Zod (contrato compartido) · Tailwind · Vitest · Playwright.

## Requisitos

- Node.js ≥ 20 (desarrollado con Node 24)
- npm

## Arranque rápido (< 10 min)

```bash
git clone <repo-url> metrix
cd metrix
npm install        # postinstall ejecuta `prisma generate`
cp .env.example .env   # DATABASE_URL=file:./prisma/dev.db
npm run prisma:push     # crea prisma/dev.db y sincroniza el schema
npm run dev              # http://localhost:3000
```

Abrir `http://localhost:3000` y usar los 4 módulos + Historial.

> La app funciona si `.env` no existe (valores por defecto), pero se recomienda
> copiar `.env.example` para crear la base SQLite con un solo comando.

## Uso

| Ruta | Módulo |
|---|---|
| `/quadratic` | Resolución de ecuación cuadrática con **gráfico cartesiano en vivo** |
| `/pricing` | Sugerencia de precio con margen, impuesto y descuento (fórmula v1) |
| `/lead-magnet` | Simulador de precios con escenario, curva de ganancia, captura de lead e informe PDF |
| `/roi` | ROI, payback e IRR sobre flujos de caja |
| `/actuarial` | Cálculo actuarial de capital con interés compuesto |
| `/historial` | Escenarios guardados: filtros, detalle, auditoría y "Re-ejecutar" |

Cada cálculo se guarda **solo** con el botón "Guardar" (política D5). Re-ejecutar
desde el historial crea un registro **RE_RUN** nuevo, preservando el original
(política D4). La clave de idempotencia es `scopeId + module + inputHash + status`,
así un `SAVED` y un `RE_RUN` del mismo input coexisten.

## API

- `POST /api/v1/{quadratic|pricing|roi|actuarial}` — calcular sin persistir
- `POST /api/v1/margen` — margen real por unidad, piso de precio, punto de equilibrio y traslado de suba (fórmula v1 `margen-v1`) — **respuesta en formato honesto `Outcome`** (OBJ-2)
- `POST /api/v1/lead-magnet` — escenario honesto de precios: `{ formulaVersion: "lead-magnet-v1", outcomes: [Outcome], curva: {x,y}[] }` (OBJ-2; sin `precioOptimo`/`gananciaMaxima` legacy)
- `POST /api/v1/leads` — persistir contacto para descarga de informe PDF
- `GET /api/v1/scenarios` — listar (`scopeId`, `module`, `status` como query)
- `POST /api/v1/scenarios` — guardar un escenario (`{ scopeId, module, inputs }`)
- `GET /api/v1/scenarios/[id]` — detalle + auditoría
- `POST /api/v1/scenarios/[id]/re-run` — re-ejecutar (crea `RE_RUN`)

Contrato OpenAPI: `src/app/api/v1/openapi/openapi.json` (incluye `/api/v1/margen`, `/api/v1/lead-magnet` y el schema `Outcome` con `access`).

## Tests

```bash
npm test          # 231 tests Vitest (dominio, servicio, contratos API, componentes)
npm run test:e2e  # 12 tests Playwright (módulos, lead magnet, gráfico en vivo e historial)
npm run lint
npm run typecheck
npm run build
```

Suite actual: **231 tests Vitest — 231 verdes** + **12 E2E Playwright verdes**
(Fase 4 de Metrix AI saldó la deuda: bug 500 de `/api/v1/lead-magnet` reparado con
contrato honesto y el lock de concurrencia de `scenario.service` corregido).

## OBJ-2 — honestidad antes que precisión

Desde la Fase 2 de Metrix AI, **ninguna salida de producto es un número falso con
decimales**. Todo resultado se expresa como un `Outcome`:

```ts
interface Outcome {
  id: string;                    // hash canónico determinista del contenido (incluye access)
  range: [number, number];       // intervalo honesto [min, max]
  driver: string;                // la causa principal del resultado (castellano)
  action: string;                // una acción concreta, no un dato (castellano)
  confidence: "baja" | "media" | "alta";
  access: "free" | "contact-gated" | "paid";  // OBJ-1
}
```

- `POST /api/v1/margen` y `POST /api/v1/lead-magnet` responden
  `{ outcomes: Outcome[], formulaVersion }` (lead-magnet agrega `curva` como serie
  técnica de visualización). La
  `confidence` es heurística determinística (Fase 1–4 sin infraestructura de
  medición): margen → `"alta"` (todos los drivers vienen del input del usuario);
  lead-magnet → `"media"`/`"baja"` (la demanda es estimada, nunca medida).
- Contrato OpenAPI: `src/app/api/v1/openapi/openapi.json` (schema `Outcome`).

## OBJ-1 — frontera gratis/pago

Regla de dominio: **gratis si el dueño aportó todos los números; pago si Metrix
aportó uno que él no tenía** (dossier `HUMAN-WEEXPECT.md`, `OBJ-1`).

- Cada `Outcome` lleva `access`:
  - `"free"` — todos los drivers salen de inputs del usuario (p.ej. margen: comisión, merma, IVA, flete y costo los aporta el dueño).
  - `"contact-gated"` — hay un driver estimado por el sistema (paid-eligible) pero el resultado se desbloquea con contacto (p.ej. lead-magnet: la demanda es estimada; el informe se entrega tras dejar lead).
  - `"paid"` — Metrix aportó un número que el dueño no tenía. **El cobro NO está implementado** (AC Fase 3); el valor queda reservado en el contrato.
- El `id` (hash determinista) incluye `access`: el mismo contenido con nivel distinto es un resultado distinto.
- Regla canónica: `accessFromSources({ systemEstimatedDriver, gatedByContact })` en `src/domain/shared/outcome.ts`.
- **Los precios y niveles NO los define el sistema** (decisión de Mariano, dossier §Waiver línea 165). Estado y preguntas pendientes: `docs/NIVELES_ACCESO_METRIX_AI.md`.
- Persistencia: `Lead.access String?` (nullable) registra el nivel con el que se desbloqueó un contacto.

## Estructura

```
src/
  domain/            # Dominio puro (fórmulas v1) + tests
  scenarios/         # Servicio + repositorio + auditoría
  lib/               # Zod validation, helpers API, Prisma
  app/api/v1/        # Route Handlers
  app/{modulos}/     # Páginas UI cliente
  components/        # CalculatorForm, ResultPanel, ScenarioList, ScenarioDetail
  e2e/               # Playwright specs
schema.prisma        # Schema Prisma (raíz, ver nota)
docs/                # Blueprint arquitectura y plan
```

Nota: `schema.prisma` vive en la raíz para que el CLI y el runtime resuelvan la
misma base SQLite (`prisma/dev.db`).

## Documentación

- `docs/ROADMAP_REFUNDACION_METRIX_AI.md` — roadmap de refundación a Metrix AI: Fases 2 (OBJ-2 Outcome), 3 (OBJ-1 access), 4 (MVP-2) y 5 (MVP-3), más deuda técnica.
- `docs/NIVELES_ACCESO_METRIX_AI.md` — niveles de acceso OBJ-1: regla de dominio, estado y decisiones pendientes de Mariano (precios/niveles).
- `docs/METRIX_ARQUITECTURA_Y_PLAN.md` — blueprint completo: decisiones D1–D6,
  fórmulas v1, modelo de datos, protocolo de testing y fases CA0–CA8.