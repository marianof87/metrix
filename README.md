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
| `/quadratic` | Resolución de ecuación cuadrática |
| `/pricing` | Sugerencia de precio con margen, impuesto y descuento |
| `/roi` | ROI, payback e IRR sobre flujos de caja |
| `/actuarial` | Cálculo actuarial de capital con interés compuesto |
| `/historial` | Escenarios guardados: filtros, detalle, auditoría y "Re-ejecutar" |

Cada cálculo se guarda **solo** con el botón "Guardar" (política D5). Re-ejecutar
desde el historial crea un registro **RE_RUN** nuevo, preservando el original
(política D4). La clave de idempotencia es `scopeId + module + inputHash + status`,
así un `SAVED` y un `RE_RUN` del mismo input coexisten.

## API

- `POST /api/v1/{quadratic|pricing|roi|actuarial}` — calcular sin persistir
- `GET /api/v1/scenarios` — listar (`scopeId`, `module`, `status` como query)
- `POST /api/v1/scenarios` — guardar un escenario (`{ scopeId, module, inputs }`)
- `GET /api/v1/scenarios/[id]` — detalle + auditoría
- `POST /api/v1/scenarios/[id]/re-run` — re-ejecutar (crea `RE_RUN`)

Contrato OpenAPI: `src/app/api/v1/openapi/openapi.json`.

## Tests

```bash
npm test          # 198 tests Vitest (dominio, servicio, API)
npm run test:e2e  # 10 tests Playwright (4 módulos + historial) — requiere `npm run dev` o arranca solo
npm run lint
npm run typecheck
npm run build
```

Suite total al cierre de Fase 7: **208 tests verdes** (198 unit + 10 E2E).

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

- `docs/METRIX_ARQUITECTURA_Y_PLAN.md` — blueprint completo: decisiones D1–D6,
  fórmulas v1, modelo de datos, protocolo de testing y fases CA0–CA8.