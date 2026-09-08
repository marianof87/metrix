/**
 * metrix · domain/pricing/pricing.ts
 * Simulador de precios. Fórmula v1: 'pricing-v1'.
 * Dominio PURO: sin imports de framework.
 *
 * Modelo v1 (documentado en blueprint §3.3):
 *   suggestedPrice = baseCost / (1 - desiredMarginPct)
 *   con validación 0 ≤ desiredMarginPct < 1.
 */

import { round, div, add, sub, mul } from "../shared/decimal";

export const PRICING_FORMULA_VERSION = "pricing-v1";

export interface PricingInputs {
  baseCost: number;
  /** margen objetivo en tanto por uno (0.30 = 30%) */
  desiredMarginPct: number;
  /** impuesto opcional en tanto por uno (0.21 = 21%) */
  taxPct?: number;
  /** unidades para totalización */
  quantity?: number;
  /** descuento opcional en tanto por uno (0.10 = 10%) */
  discountPct?: number;
  currency?: string;
}

export interface PricingResult {
  formulaVersion: string;
  suggestedPrice: number;
  priceWithDiscount: number;
  priceWithTax: number;
  finalPrice: number;
  grossMargin: number;
  marginPct: number;
  totalRevenue?: number;
  totalCost?: number;
  breakdown: {
    baseCost: number;
    percentMargin: number;
    addedValue: number;
    suggestedPrice: number;
  };
}

/**
 * Error de dominio para inputs inválidos de pricing.
 */
export class PricingDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingDomainError";
  }
}

/**
 * Calcula el precio sugerido y el desglose del simulador de precios.
 * @throws PricingDomainError si desiredMarginPct fuera de [0, 1) o baseCost inválido.
 */
export function calculatePricing(inputs: PricingInputs): PricingResult {
  const { baseCost, desiredMarginPct } = inputs;

  if (!Number.isFinite(baseCost) || baseCost < 0) {
    throw new PricingDomainError("baseCost must be a finite non-negative number");
  }
  if (
    !Number.isFinite(desiredMarginPct) ||
    desiredMarginPct < 0 ||
    desiredMarginPct >= 1
  ) {
    throw new PricingDomainError("desiredMarginPct must satisfy 0 <= margin < 1");
  }

  // suggestedPrice = baseCost / (1 - desiredMarginPct)
  const suggestedPrice = div(baseCost, 1 - desiredMarginPct);

  const discountPct = inputs.discountPct ?? 0;
  if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 1) {
    throw new PricingDomainError("discountPct must satisfy 0 <= discount <= 1");
  }

  const taxPct = inputs.taxPct ?? 0;
  if (!Number.isFinite(taxPct) || taxPct < 0) {
    throw new PricingDomainError("taxPct must be a finite non-negative number");
  }

  const quantity = inputs.quantity ?? 1;
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new PricingDomainError("quantity must be a finite non-negative number");
  }

  const priceWithDiscount = mul(suggestedPrice, 1 - discountPct);
  const priceWithTax = mul(priceWithDiscount, 1 + taxPct);
  const finalPrice = priceWithTax;

  const grossMargin = sub(suggestedPrice, baseCost);
  // Si el precio sugerido es 0, el margen porcentual no está definido; se devuelve 0.
  const marginPct = suggestedPrice !== 0 ? div(grossMargin, suggestedPrice) : 0;

  const totalRevenue = quantity > 0 ? mul(finalPrice, quantity) : undefined;
  const totalCost = quantity > 0 ? mul(baseCost, quantity) : undefined;

  return {
    formulaVersion: PRICING_FORMULA_VERSION,
    suggestedPrice: round(suggestedPrice),
    priceWithDiscount: round(priceWithDiscount),
    priceWithTax: round(priceWithTax),
    finalPrice: round(finalPrice),
    grossMargin: round(grossMargin),
    marginPct: round(marginPct),
    totalRevenue: totalRevenue !== undefined ? round(totalRevenue) : undefined,
    totalCost: totalCost !== undefined ? round(totalCost) : undefined,
    breakdown: {
      baseCost,
      percentMargin: desiredMarginPct,
      addedValue: round(sub(suggestedPrice, baseCost)),
      suggestedPrice: round(suggestedPrice),
    },
  };
}