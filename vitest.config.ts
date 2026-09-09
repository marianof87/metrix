import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Serialización de archivos: la suite comparte una única BD SQLite
    // (prisma/dev.db) entre archivos de integración; el paralelismo provoca
    // carreras entre deleteMany()s de cada archivo (determinismo > velocidad).
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: ["src/domain/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/types.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
