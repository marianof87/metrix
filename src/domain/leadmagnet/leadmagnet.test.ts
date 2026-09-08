/**
 * metrix · domain/leadmagnet/leadmagnet.test.ts
 * Unit tests del dominio puro del lead magnet y sus schemas.
 */

import { describe, it, expect } from "vitest";
import {
  optimizarPrecio,
  buildProfitCurve,
  LeadMagnetDomainError,
  LEAD_MAGNET_FORMULA_VERSION,
} from "./leadmagnet";
import { leadMagnetInputSchema, leadSchema } from "@/lib/validation";

describe("optimizarPrecio", () => {
  it("caso base: A=-2,B=120,C=-1000, min 10, max 100 → precio 30, ganancia 800", () => {
    const res = optimizarPrecio({
      coeficienteA: -2,
      coeficienteB: 120,
      coeficienteC: -1000,
      precioMinimo: 10,
      precioMaximo: 100,
    });
    expect(res.precioOptimo).toBeCloseTo(30, 2);
    expect(res.gananciaMaxima).toBeCloseTo(800, 2);
    expect(res.estrategiaSugerida).toBe("Mantener el precio en el punto de equilibrio óptimo.");
  });

  it("clamp por mínimo: min 50 → precio 50", () => {
    const res = optimizarPrecio({
      coeficienteA: -2,
      coeficienteB: 120,
      coeficienteC: -1000,
      precioMinimo: 50,
      precioMaximo: 100,
    });
    expect(res.precioOptimo).toBeCloseTo(50, 2);
  });

  it("clamp por máximo: max 20 → precio 20", () => {
    const res = optimizarPrecio({
      coeficienteA: -2,
      coeficienteB: 120,
      coeficienteC: -1000,
      precioMinimo: 10,
      precioMaximo: 20,
    });
    expect(res.precioOptimo).toBeCloseTo(20, 2);
  });

  it("A >= 0 → throw LeadMagnetDomainError", () => {
    expect(() =>
      optimizarPrecio({
        coeficienteA: 0,
        coeficienteB: 120,
        coeficienteC: -1000,
        precioMinimo: 10,
        precioMaximo: 100,
      })
    ).toThrow(LeadMagnetDomainError);
  });

  it("estrategia: vértice >= max → mercado tolera precio mayor", () => {
    const res = optimizarPrecio({
      coeficienteA: -2,
      coeficienteB: 1200,
      coeficienteC: -1000,
      precioMinimo: 10,
      precioMaximo: 100,
    });
    expect(res.estrategiaSugerida).toBe(
      "El mercado tolera un precio mayor. Considerar expandir el límite máximo."
    );
  });

  it("estrategia: vértice <= min → demanda débil", () => {
    const res = optimizarPrecio({
      coeficienteA: -2,
      coeficienteB: 1,
      coeficienteC: -1000,
      precioMinimo: 50,
      precioMaximo: 100,
    });
    expect(res.estrategiaSugerida).toBe(
      "Demanda débil. Se sugiere mantener el precio en el mínimo para asegurar volumen."
    );
  });

  it("estrategia: caso medio → mantener equilibrio óptimo", () => {
    const res = optimizarPrecio({
      coeficienteA: -2,
      coeficienteB: 120,
      coeficienteC: -1000,
      precioMinimo: 10,
      precioMaximo: 100,
    });
    expect(res.estrategiaSugerida).toBe("Mantener el precio en el punto de equilibrio óptimo.");
  });
});

describe("buildProfitCurve", () => {
  const datos = {
    coeficienteA: -2,
    coeficienteB: 120,
    coeficienteC: -1000,
    precioMinimo: 10,
    precioMaximo: 100,
  };
  const resultado = optimizarPrecio(datos);

  it("genera 25 puntos (i 0..24)", () => {
    const curva = buildProfitCurve(datos, resultado);
    expect(curva.labels).toHaveLength(25);
    expect(curva.datos).toHaveLength(25);
  });

  it("primer y último label = min y max", () => {
    const curva = buildProfitCurve(datos, resultado);
    expect(curva.labels[0]).toBe(10);
    expect(curva.labels[24]).toBe(100);
  });

  it("valor del punto i=12 == ganancia en (min+max)/2", () => {
    const curva = buildProfitCurve(datos, resultado);
    const medio = (10 + 100) / 2;
    const gananciaEsperada = Number(
      (-2 * Math.pow(medio, 2) + 120 * medio - 1000).toFixed(2)
    );
    expect(curva.datos[12]).toBeCloseTo(gananciaEsperada, 2);
  });

  it("optimo == { x: precioOptimo, y: gananciaMaxima }", () => {
    const curva = buildProfitCurve(datos, resultado);
    expect(curva.optimo).toEqual({ x: resultado.precioOptimo, y: resultado.gananciaMaxima });
  });

  it("labels y datos con 2 decimales", () => {
    const curva = buildProfitCurve(datos, resultado);
    for (const label of curva.labels) {
      expect(Number(label.toFixed(2))).toBeCloseTo(label, 2);
    }
    for (const dato of curva.datos) {
      expect(Number(dato.toFixed(2))).toBeCloseTo(dato, 2);
    }
  });

  it("precisión 2 decimales en precio/ganancia (A=-1,B=99.5)", () => {
    const res = optimizarPrecio({
      coeficienteA: -1,
      coeficienteB: 99.5,
      coeficienteC: -100,
      precioMinimo: 10,
      precioMaximo: 100,
    });
    expect(Number(res.precioOptimo.toFixed(2))).toBeCloseTo(res.precioOptimo, 2);
    expect(Number(res.gananciaMaxima.toFixed(2))).toBeCloseTo(res.gananciaMaxima, 2);
  });
});

describe("leadMagnetInputSchema", () => {
  const valido = {
    coeficienteA: -2,
    coeficienteB: 120,
    coeficienteC: -1000,
    precioMinimo: 10,
    precioMaximo: 100,
  };

  it("acepta input válido", () => {
    const res = leadMagnetInputSchema.safeParse(valido);
    expect(res.success).toBe(true);
  });

  it("rechaza A >= 0", () => {
    const res = leadMagnetInputSchema.safeParse({ ...valido, coeficienteA: 2 });
    expect(res.success).toBe(false);
  });

  it("rechaza max <= min", () => {
    const res = leadMagnetInputSchema.safeParse({ ...valido, precioMaximo: 10 });
    expect(res.success).toBe(false);
  });

  it("rechaza min < 0", () => {
    const res = leadMagnetInputSchema.safeParse({ ...valido, precioMinimo: -1 });
    expect(res.success).toBe(false);
  });

  it("rechaza max <= 0", () => {
    const res = leadMagnetInputSchema.safeParse({ ...valido, precioMaximo: 0 });
    expect(res.success).toBe(false);
  });

  it("rechaza no finito", () => {
    const res = leadMagnetInputSchema.safeParse({ ...valido, coeficienteB: Infinity });
    expect(res.success).toBe(false);
  });
});

describe("leadSchema", () => {
  const valido = {
    nombre: "Ana Pérez",
    empresa: "Textil Sur",
    whatsapp: "+54 9 351 555-1234",
    email: "ana@empresa.com",
  };

  it("acepta lead válido", () => {
    expect(leadSchema.safeParse(valido).success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const res = leadSchema.safeParse({ ...valido, email: "no-es-email" });
    expect(res.success).toBe(false);
  });

  it("rechaza whatsapp < 6", () => {
    const res = leadSchema.safeParse({ ...valido, whatsapp: "12345" });
    expect(res.success).toBe(false);
  });

  it("rechaza nombre vacío", () => {
    const res = leadSchema.safeParse({ ...valido, nombre: "   " });
    expect(res.success).toBe(false);
  });

  it("lead-magnet formulaVersion exportada", () => {
    expect(LEAD_MAGNET_FORMULA_VERSION).toBe("lead-magnet-v1");
  });
});