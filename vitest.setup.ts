/**
 * metrix · vitest.setup.ts
 * Setup global de Vitest: carga variables de entorno desde .env para que
 * Prisma Client tenga DATABASE_URL disponible en los tests de integración.
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });