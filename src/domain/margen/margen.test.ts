/**
 * metrix · domain/margen/margen.test.ts
 * Fase VERIFY/RED — SPEC FASE1_T1 margen-v1
 * Estos tests DEBEN FALLAR hasta implementar src/domain/margen/margen.ts
 */
import { describe, it, expect } from "vitest";
// Importa aunque no exista — es lo que provoca RED por módulo inexistente
import {
  calcularMargenReal,
  calcularTrasladoSuba,
  MargenDomainError,
  MARGEN_FORMULA_VERSION,
} from "@/domain/margen/margen";
import { round } from "@/domain/shared/decimal";

describe("domain/margen — calcularMargenReal", () => {
  it("caso simple sin tasas: margen = precio − costo", () => {
    // precioVenta 100, costo 60, sin tasas, sin flete → ingreso 100, margen 40
    const r = calcularMargenReal({
      precioVenta: 100,
      costoUnitario: 60,
      comisionPct: 0,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
    });
    expect(r.formulaVersion).toBe("margen-v1");
    expect(r.precioVenta).toBe(100);
    expect(r.comisionAbs).toBe(0);
    expect(r.mermaAbs).toBe(0);
    expect(r.ivaAbs).toBe(0);
    expect(r.ingresoNetoUnitario).toBe(100);
    expect(r.margenRealUnitario).toBe(40);
    expect(r.margenPct).toBeCloseTo(0.4, 10);
    expect(r.puedeCubrirCostos).toBe(true);
    expect(r.pisoPrecioSku).toBeCloseTo(60, 10); // (60+0)/(1-0)
    expect(MARGEN_FORMULA_VERSION).toBe("margen-v1");
  });

  it("margen real unitario con comisión 10% → resta 10% del precio", () => {
    // 100 *0.1=10, ingreso 90, costo 60 → margen 30, piso 60/0.9=66.666...
    const r = calcularMargenReal({
      precioVenta: 100,
      costoUnitario: 60,
      comisionPct: 0.1,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
    });
    expect(r.comisionAbs).toBeCloseTo(10, 10);
    expect(r.ingresoNetoUnitario).toBeCloseTo(90, 10);
    expect(r.margenRealUnitario).toBeCloseTo(30, 10);
    expect(r.margenPct).toBeCloseTo(0.3, 10);
    expect(r.pisoPrecioSku).toBeCloseTo(66.6666666667, 4);
    expect(r.puedeCubrirCostos).toBe(true);
  });

  it("merma 5% + flete 15: descuenta ambos del ingreso", () => {
    // precio 200, merma 0.05→10, flete 15, costo 80 → ingreso 175, margen 95
    const r = calcularMargenReal({
      precioVenta: 200,
      costoUnitario: 80,
      comisionPct: 0,
      mermaPct: 0.05,
      ivaPct: 0,
      fleteUnitario: 15,
    });
    expect(r.mermaAbs).toBeCloseTo(10, 10);
    expect(r.fleteUnitario).toBe(15);
    expect(r.ingresoNetoUnitario).toBeCloseTo(175, 10);
    expect(r.margenRealUnitario).toBeCloseTo(95, 10);
    expect(r.margenPct).toBeCloseTo(0.475, 10);
    expect(r.pisoPrecioSku).toBeCloseTo(100, 10); // (80+15)/0.95
  });

  it("IVA 21% → resta 21 del precio", () => {
    // precio 100, iva 0.21→21, costo 50 → ingreso 79, margen 29
    const r = calcularMargenReal({
      precioVenta: 100,
      costoUnitario: 50,
      comisionPct: 0,
      mermaPct: 0,
      ivaPct: 0.21,
      fleteUnitario: 0,
    });
    expect(r.ivaAbs).toBeCloseTo(21, 10);
    expect(r.ingresoNetoUnitario).toBeCloseTo(79, 10);
    expect(r.margenRealUnitario).toBeCloseTo(29, 10);
    expect(r.margenPct).toBeCloseTo(0.29, 10);
    expect(r.pisoPrecioSku).toBeCloseTo(63.2911392405, 4); // 50/0.79
  });

  it("margen negativo → puedeCubrirCostos false", () => {
    // precio 100, comisión 0.2→20, costo 90 → ingreso 80, margen -10
    const r = calcularMargenReal({
      precioVenta: 100,
      costoUnitario: 90,
      comisionPct: 0.2,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
    });
    expect(r.ingresoNetoUnitario).toBeCloseTo(80, 10);
    expect(r.margenRealUnitario).toBeCloseTo(-10, 10);
    expect(r.margenPct).toBeCloseTo(-0.1, 10);
    expect(r.puedeCubrirCostos).toBe(false);
    expect(r.pisoPrecioSku).toBeCloseTo(112.5, 10); // (90)/0.8
  });

  it("todas las tasas combinadas: comision 10% + merma 5% + IVA 21% + flete 10", () => {
    // precio 100, com 10, merma 5, iva 21, flete 10 → ingreso 54, costo 30 → margen 24
    const r = calcularMargenReal({
      precioVenta: 100,
      costoUnitario: 30,
      comisionPct: 0.1,
      mermaPct: 0.05,
      ivaPct: 0.21,
      fleteUnitario: 10,
    });
    expect(r.comisionAbs).toBeCloseTo(10, 10);
    expect(r.mermaAbs).toBeCloseTo(5, 10);
    expect(r.ivaAbs).toBeCloseTo(21, 10);
    expect(r.ingresoNetoUnitario).toBeCloseTo(54, 10);
    expect(r.margenRealUnitario).toBeCloseTo(24, 10);
    expect(r.margenPct).toBeCloseTo(0.24, 10);
    // piso (30+10)/(1-0.36)=40/0.64=62.5
    expect(r.pisoPrecioSku).toBeCloseTo(62.5, 10);
  });

  it("piso de precio con denominador OK → (costo+flete)/(1−tasas)", () => {
    // costo 40, flete 10, tasas 0.1 → piso 50/0.9=55.555...
    const r = calcularMargenReal({
      precioVenta: 100,
      costoUnitario: 40,
      comisionPct: 0.1,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 10,
    });
    expect(r.pisoPrecioSku).not.toBeNull();
    expect(r.pisoPrecioSku).toBeCloseTo(55.5555555556, 4);
    expect(r.pisoPrecioSkuAviso).toBeUndefined();
  });

  it("piso con denominador ≤ 0 → null + aviso (tasas al límite)", () => {
    // tasas 0.6+0.3+0.1 = 1.0: o se valida (throw) o se retorna null+aviso.
    // Ambos caminos son aceptables según SPEC; el try/catch documenta la expectativa.
    try {
      const r = calcularMargenReal({
        precioVenta: 100,
        costoUnitario: 40,
        comisionPct: 0.6,
        mermaPct: 0.3,
        ivaPct: 0.1,
        fleteUnitario: 5,
      });
      // camino piso null
      expect(r.pisoPrecioSku).toBeNull();
      expect(r.pisoPrecioSkuAviso).toBe("Con estas tasas no existe un piso de precio finito");
    } catch (e: any) {
      // camino validación sum≥1 → error de dominio (también válido según spec)
      expect(e.name).toBe("MargenDomainError");
      expect(e.message).toMatch(/suma.*menor que 1/i);
    }
  });

  it("equilibrio con costos fijos y margen positivo → unidades = fijos/margen", () => {
    // margen 40 (100-60), fijos 800 → equilibrio 20
    const r = calcularMargenReal({
      precioVenta: 100,
      costoUnitario: 60,
      comisionPct: 0,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
      costosFijosMensuales: 800,
    });
    expect(r.margenRealUnitario).toBeCloseTo(40, 10);
    expect(r.puntoEquilibrioUnidades).toBeCloseTo(20, 10);
    // equilibrioAlcanzable no debe ser false; puede ser true o undefined según implementación
    expect(r.equilibrioAlcanzable === false).toBe(false);
    expect(Number.isFinite(r.puntoEquilibrioUnidades as number)).toBe(true);
  });

  it("equilibrio no alcanzable con margen ≤ 0 y costos fijos → false y sin unidades", () => {
    // precio 100, costo 110 → margen -10, fijos 500
    const r = calcularMargenReal({
      precioVenta: 100,
      costoUnitario: 110,
      comisionPct: 0,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
      costosFijosMensuales: 500,
    });
    expect(r.margenRealUnitario).toBeCloseTo(-10, 10);
    expect(r.puedeCubrirCostos).toBe(false);
    expect(r.equilibrioAlcanzable).toBe(false);
    expect(r.puntoEquilibrioUnidades).toBeUndefined();
  });

  it("sin costosFijosMensuales no expone equilibrio", () => {
    const r = calcularMargenReal({
      precioVenta: 100,
      costoUnitario: 60,
      comisionPct: 0,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
    });
    expect(r.puntoEquilibrioUnidades).toBeUndefined();
    expect(r.equilibrioAlcanzable).toBeUndefined();
  });

  it("aplica round() de shared/decimal a monetarios", () => {
    // 0.1+0.2 caso: precio 33.33, comisión 0.1 → comisionAbs 3.333
    const r = calcularMargenReal({
      precioVenta: 33.33,
      costoUnitario: 10,
      comisionPct: 0.1,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
    });
    // round con 10 decimales no debe dejar ruido flotante
    expect(r.comisionAbs).toBe(round(33.33 * 0.1));
    expect(r.ingresoNetoUnitario).toBe(round(33.33 - 33.33 * 0.1));
    expect(r.margenRealUnitario).toBe(round(33.33 - 33.33 * 0.1 - 10));
  });
});

describe("domain/margen — validaciones y MargenDomainError", () => {
  it("lanza MargenDomainError si precioVenta ≤ 0", () => {
    expect(() =>
      calcularMargenReal({
        precioVenta: 0,
        costoUnitario: 10,
        comisionPct: 0,
        mermaPct: 0,
        ivaPct: 0,
        fleteUnitario: 0,
      }),
    ).toThrow(MargenDomainError);
    try {
      calcularMargenReal({ precioVenta: 0, costoUnitario: 10, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 });
    } catch (e: any) {
      expect(e.name).toBe("MargenDomainError");
      expect(e.message).toMatch(/precioVenta debe ser un número finito mayor que 0/i);
    }
  });

  it("lanza si precioVenta es NaN o Infinity", () => {
    expect(() =>
      calcularMargenReal({ precioVenta: NaN, costoUnitario: 10, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 }),
    ).toThrow(MargenDomainError);
    expect(() =>
      calcularMargenReal({ precioVenta: Infinity, costoUnitario: 10, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 }),
    ).toThrow(MargenDomainError);
  });

  it("lanza si comisionPct/mermaPct/ivaPct fuera de [0,1)", () => {
    expect(() =>
      calcularMargenReal({ precioVenta: 100, costoUnitario: 10, comisionPct: 1, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 }),
    ).toThrow(MargenDomainError);
    expect(() =>
      calcularMargenReal({ precioVenta: 100, costoUnitario: 10, comisionPct: -0.01, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 }),
    ).toThrow(MargenDomainError);
    expect(() =>
      calcularMargenReal({ precioVenta: 100, costoUnitario: 10, comisionPct: 0, mermaPct: 1, ivaPct: 0, fleteUnitario: 0 }),
    ).toThrow(MargenDomainError);
    expect(() =>
      calcularMargenReal({ precioVenta: 100, costoUnitario: 10, comisionPct: 0, mermaPct: 0, ivaPct: 1, fleteUnitario: 0 }),
    ).toThrow(MargenDomainError);
    try {
      calcularMargenReal({ precioVenta: 100, costoUnitario: 10, comisionPct: 1, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 });
    } catch (e: any) {
      expect(e.message).toMatch(/comisionPct\/mermaPct\/ivaPct deben estar en \[0, 1\)/i);
    }
  });

  it("lanza si costoUnitario/fleteUnitario/costosFijosMensuales < 0", () => {
    expect(() =>
      calcularMargenReal({ precioVenta: 100, costoUnitario: -1, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 }),
    ).toThrow(MargenDomainError);
    expect(() =>
      calcularMargenReal({ precioVenta: 100, costoUnitario: 10, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: -5 }),
    ).toThrow(MargenDomainError);
    expect(() =>
      calcularMargenReal({ precioVenta: 100, costoUnitario: 10, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0, costosFijosMensuales: -100 }),
    ).toThrow(MargenDomainError);
    try {
      calcularMargenReal({ precioVenta: 100, costoUnitario: -1, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 });
    } catch (e: any) {
      expect(e.message).toMatch(/costoUnitario\/fleteUnitario\/costosFijosMensuales deben ser ≥ 0/i);
    }
  });

  it("lanza si suma de tasas ≥ 1", () => {
    // 0.5+0.3+0.2 =1.0 → inválido
    expect(() =>
      calcularMargenReal({
        precioVenta: 100,
        costoUnitario: 10,
        comisionPct: 0.5,
        mermaPct: 0.3,
        ivaPct: 0.2,
        fleteUnitario: 0,
      }),
    ).toThrow(MargenDomainError);
    try {
      calcularMargenReal({ precioVenta: 100, costoUnitario: 10, comisionPct: 0.5, mermaPct: 0.3, ivaPct: 0.2, fleteUnitario: 0 });
    } catch (e: any) {
      expect(e.name).toBe("MargenDomainError");
      expect(e.message).toMatch(/suma de comisionPct \+ mermaPct \+ ivaPct debe ser menor que 1/i);
    }
    // borde 0.99 válido no debe lanzar
    expect(() =>
      calcularMargenReal({ precioVenta: 100, costoUnitario: 10, comisionPct: 0.5, mermaPct: 0.3, ivaPct: 0.19, fleteUnitario: 0 }),
    ).not.toThrow();
  });
});

describe("domain/margen — calcularTrasladoSuba", () => {
  it("mantiene margenAbsActual y calcula precio nuevo con delta esperado", () => {
    // precioActual 100, costoAnt 50, costoNuevo 60, comision 0.1, flete 10
    // ingresoNeto =100-10-10=80, margenAbs=30, precioNuevo=(60+30+10)/0.9=111.111...
    const r = calcularTrasladoSuba({
      precioVentaActual: 100,
      costoAnteriorUnitario: 50,
      costoNuevoUnitario: 60,
      comisionPct: 0.1,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 10,
    });
    expect(r.formulaVersion).toBe("margen-v1");
    expect(r.margenAbsActual).toBeCloseTo(30, 10);
    expect(r.precioVentaNuevo).toBeCloseTo(111.1111111111, 4);
    expect(r.deltaPrecioAbs).toBeCloseTo(11.1111111111, 4);
    expect(r.deltaPrecioPct).toBeCloseTo(0.1111111111, 4);
    // coherencia: delta = nuevo - actual
    expect(r.deltaPrecioAbs).toBeCloseTo(r.precioVentaNuevo - 100, 10);
    expect(r.deltaPrecioPct).toBeCloseTo(r.deltaPrecioAbs / 100, 10);
  });

  it("traslado sin tasas: precio nuevo = costoNuevo + margenAbs + flete", () => {
    // precio 100, costoAnt 60, costoNuevo 70, sin tasas, flete 0 → margen 40, nuevo 110
    const r = calcularTrasladoSuba({
      precioVentaActual: 100,
      costoAnteriorUnitario: 60,
      costoNuevoUnitario: 70,
      comisionPct: 0,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
    });
    expect(r.margenAbsActual).toBeCloseTo(40, 10);
    expect(r.precioVentaNuevo).toBeCloseTo(110, 10);
    expect(r.deltaPrecioAbs).toBeCloseTo(10, 10);
    expect(r.deltaPrecioPct).toBeCloseTo(0.1, 10);
  });

  it("traslado preserva fechaDesde passthrough", () => {
    const r = calcularTrasladoSuba({
      precioVentaActual: 100,
      costoAnteriorUnitario: 50,
      costoNuevoUnitario: 55,
      comisionPct: 0,
      mermaPct: 0,
      ivaPct: 0,
      fleteUnitario: 0,
      fechaDesde: "2026-09-01",
    });
    expect(r.fechaDesde).toBe("2026-09-01");
  });

  it("lanza MargenDomainError si precioVentaActual ≤ 0 o no finito", () => {
    expect(() =>
      calcularTrasladoSuba({ precioVentaActual: 0, costoAnteriorUnitario: 10, costoNuevoUnitario: 12, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 }),
    ).toThrow(MargenDomainError);
    expect(() =>
      calcularTrasladoSuba({ precioVentaActual: NaN, costoAnteriorUnitario: 10, costoNuevoUnitario: 12, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 }),
    ).toThrow(MargenDomainError);
    try {
      calcularTrasladoSuba({ precioVentaActual: 0, costoAnteriorUnitario: 10, costoNuevoUnitario: 12, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 });
    } catch (e: any) {
      expect(e.message).toMatch(/precioVentaActual debe ser > 0/i);
    }
  });

  it("lanza si costoNuevoUnitario < 0 o tasas inválidas", () => {
    expect(() =>
      calcularTrasladoSuba({ precioVentaActual: 100, costoAnteriorUnitario: 10, costoNuevoUnitario: -5, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 }),
    ).toThrow(MargenDomainError);
    try {
      calcularTrasladoSuba({ precioVentaActual: 100, costoAnteriorUnitario: 10, costoNuevoUnitario: -5, comisionPct: 0, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 });
    } catch (e: any) {
      expect(e.message).toMatch(/costoNuevoUnitario debe ser ≥ 0/i);
    }
    expect(() =>
      calcularTrasladoSuba({ precioVentaActual: 100, costoAnteriorUnitario: 10, costoNuevoUnitario: 10, comisionPct: 1, mermaPct: 0, ivaPct: 0, fleteUnitario: 0 }),
    ).toThrow(MargenDomainError);
  });

  it("lanza si suma de tasas ≥ 1 en traslado", () => {
    expect(() =>
      calcularTrasladoSuba({ precioVentaActual: 100, costoAnteriorUnitario: 10, costoNuevoUnitario: 12, comisionPct: 0.5, mermaPct: 0.3, ivaPct: 0.2, fleteUnitario: 0 }),
    ).toThrow(MargenDomainError);
  });
});