/**
 * metrix · domain/margen/margen.ts
 * T1 de Metrix AI — margen real por unidad (spec docs/SPEC_FASE1_T1.md)
 * Fórmula v1: 'margen-v1'.
 * Dominio PURO: sin imports de framework.
 *
 * Modelo v1:
 *   comisionAbs  = precioVenta * comisionPct
 *   mermaAbs     = precioVenta * mermaPct
 *   ivaAbs       = precioVenta * ivaPct
 *   ingresoNeto  = precioVenta - comisionAbs - mermaAbs - fleteUnitario - ivaAbs
 *   margenReal   = ingresoNeto - costoUnitario
 *   pisoPrecio   = (costoUnitario + fleteUnitario) / (1 - (comisionPct + mermaPct + ivaPct))
 * Traslado de suba: mantiene margenAbsActual con el costo nuevo del proveedor.
 */

import { round, add, sub, mul, div } from "../shared/decimal";

export const MARGEN_FORMULA_VERSION = "margen-v1";

/**
 * Tolerancia para la suma de tasas: con float, 0.6+0.3+0.1 = 0.9999999999999999 < 1.
 * Se rechaza una suma ≥ 1 − 1e-9 para evitar divisor ~0 en el piso de precio.
 *
 * Decisión de diseño (fail-fast, ver AUDIT Fase 1): si la suma de tasas alcanza
 * TASA_SUMA_MAX se lanza MargenDomainError (400) en lugar de devolver
 * pisoPrecioSku: null + pisoPrecioSkuAviso. Eso deja `pisoPrecioSkuAviso` como
 * campo reservado (dead-code en esta rama): la guarda previa garantiza que el
 * denominador (1 − tasaSuma) del piso nunca baja de 1e-9, por lo que `div` no
 * puede lanzar su Error genérico (riesgo teórico M-2 si se aflojara la tolerancia).
 */
const TASA_SUMA_MAX = 1 - 1e-9;

export interface MargenInputs {
  precioVenta: number;
  /** % sobre venta (plataforma/marketplace) en tanto por uno (0.10 = 10%) */
  comisionPct: number;
  /** merma como % sobre venta */
  mermaPct: number;
  /** IVA % sobre venta (se detrae del ingreso) */
  ivaPct: number;
  fleteUnitario: number;
  costoUnitario: number;
  costosFijosMensuales?: number;
  fechaDesde?: string;
}

export interface MargenResult {
  formulaVersion: string;
  precioVenta: number;
  comisionAbs: number;
  mermaAbs: number;
  ivaAbs: number;
  fleteUnitario: number;
  costoUnitario: number;
  ingresoNetoUnitario: number;
  margenRealUnitario: number;
  margenPct: number;
  /** true si el margen real unitario > 0 (el producto deja plata) */
  puedeCubrirCostos: boolean;
  puntoEquilibrioUnidades?: number;
  equilibrioAlcanzable?: boolean;
  pisoPrecioSku: number | null;
  pisoPrecioSkuAviso?: string;
  fechaDesde?: string;
}

export interface TrasladoInputs {
  precioVentaActual: number;
  costoAnteriorUnitario: number;
  costoNuevoUnitario: number;
  comisionPct: number;
  mermaPct: number;
  ivaPct: number;
  fleteUnitario: number;
  fechaDesde?: string;
}

export interface TrasladoResult {
  formulaVersion: string;
  margenAbsActual: number;
  precioVentaNuevo: number;
  deltaPrecioAbs: number;
  deltaPrecioPct: number;
  fechaDesde?: string;
}

/**
 * Error de dominio para inputs inválidos de margen.
 */
export class MargenDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MargenDomainError";
  }
}

function assertRangePct(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new MargenDomainError("comisionPct/mermaPct/ivaPct deben estar en [0, 1)");
  }
}

function assertNonNegative(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new MargenDomainError("costoUnitario/fleteUnitario/costosFijosMensuales deben ser ≥ 0");
  }
}

/**
 * Calcula el margen real por unidad con comisión, merma, flete e IVA.
 * @throws MargenDomainError si algún input es inválido.
 */
export function calcularMargenReal(inputs: MargenInputs): MargenResult {
  const { precioVenta, comisionPct, mermaPct, ivaPct, fleteUnitario, costoUnitario } = inputs;

  if (!Number.isFinite(precioVenta) || precioVenta <= 0) {
    throw new MargenDomainError("precioVenta debe ser un número finito mayor que 0");
  }
  assertRangePct(comisionPct);
  assertRangePct(mermaPct);
  assertRangePct(ivaPct);
  const tasaSuma = comisionPct + mermaPct + ivaPct;
  if (tasaSuma >= TASA_SUMA_MAX) {
    throw new MargenDomainError("la suma de comisionPct + mermaPct + ivaPct debe ser menor que 1");
  }
  assertNonNegative(costoUnitario);
  assertNonNegative(fleteUnitario);
  const costosFijos = inputs.costosFijosMensuales;
  if (costosFijos !== undefined) {
    assertNonNegative(costosFijos);
  }

  const comisionAbs = mul(precioVenta, comisionPct);
  const mermaAbs = mul(precioVenta, mermaPct);
  const ivaAbs = mul(precioVenta, ivaPct);
  const ingresoNetoUnitario = sub(sub(sub(sub(precioVenta, comisionAbs), mermaAbs), fleteUnitario), ivaAbs);
  const margenRealUnitario = sub(ingresoNetoUnitario, costoUnitario);
  const margenPct = div(margenRealUnitario, precioVenta);

  const puntoEquilibrioUnidades =
    costosFijos !== undefined && margenRealUnitario > 0 ? div(costosFijos, margenRealUnitario) : undefined;
  const equilibrioAlcanzable = costosFijos !== undefined ? margenRealUnitario > 0 : undefined;

  const pisoPrecioSku = div(add(costoUnitario, fleteUnitario), sub(1, tasaSuma));

  const result: MargenResult = {
    formulaVersion: MARGEN_FORMULA_VERSION,
    precioVenta: round(precioVenta),
    comisionAbs,
    mermaAbs,
    ivaAbs,
    fleteUnitario: round(fleteUnitario),
    costoUnitario: round(costoUnitario),
    ingresoNetoUnitario,
    margenRealUnitario,
    margenPct,
    puedeCubrirCostos: margenRealUnitario > 0,
    pisoPrecioSku: round(pisoPrecioSku),
  };
  if (puntoEquilibrioUnidades !== undefined) result.puntoEquilibrioUnidades = puntoEquilibrioUnidades;
  if (equilibrioAlcanzable !== undefined) result.equilibrioAlcanzable = equilibrioAlcanzable;
  if (inputs.fechaDesde !== undefined) result.fechaDesde = inputs.fechaDesde;
  return result;
}

/**
 * Traslada una suba del proveedor manteniendo el margen absoluto actual.
 * @throws MargenDomainError si algún input es inválido.
 */
export function calcularTrasladoSuba(inputs: TrasladoInputs): TrasladoResult {
  const { precioVentaActual, costoAnteriorUnitario, costoNuevoUnitario, comisionPct, mermaPct, ivaPct, fleteUnitario } = inputs;

  if (!Number.isFinite(precioVentaActual) || precioVentaActual <= 0) {
    throw new MargenDomainError("precioVentaActual debe ser > 0");
  }
  assertRangePct(comisionPct);
  assertRangePct(mermaPct);
  assertRangePct(ivaPct);
  if (comisionPct + mermaPct + ivaPct >= TASA_SUMA_MAX) {
    throw new MargenDomainError("la suma de comisionPct + mermaPct + ivaPct debe ser menor que 1");
  }
  assertNonNegative(costoAnteriorUnitario);
  if (!Number.isFinite(costoNuevoUnitario) || costoNuevoUnitario < 0) {
    throw new MargenDomainError("costoNuevoUnitario debe ser ≥ 0");
  }
  assertNonNegative(fleteUnitario);

  const comisionAbs = mul(precioVentaActual, comisionPct);
  const mermaAbs = mul(precioVentaActual, mermaPct);
  const ivaAbs = mul(precioVentaActual, ivaPct);
  const ingresoNetoActual = sub(sub(sub(sub(precioVentaActual, comisionAbs), mermaAbs), fleteUnitario), ivaAbs);
  const margenAbsActual = sub(ingresoNetoActual, costoAnteriorUnitario);

  const denominador = sub(1, comisionPct + mermaPct + ivaPct);
  const precioVentaNuevo = div(add(add(costoNuevoUnitario, margenAbsActual), fleteUnitario), denominador);
  const deltaPrecioAbs = sub(precioVentaNuevo, precioVentaActual);
  const deltaPrecioPct = div(deltaPrecioAbs, precioVentaActual);

  const result: TrasladoResult = {
    formulaVersion: MARGEN_FORMULA_VERSION,
    margenAbsActual,
    precioVentaNuevo,
    deltaPrecioAbs,
    deltaPrecioPct,
  };
  if (inputs.fechaDesde !== undefined) result.fechaDesde = inputs.fechaDesde;
  return result;
}