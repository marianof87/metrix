/**
 * metrix · lib/validation.ts
 * Schemas Zod compartidos entre API y UI. Único lugar de validación de contratos.
 */

import { z } from "zod";

// --- quadratic ---
export const quadraticInputSchema = z.object({
  a: z.number().finite(),
  b: z.number().finite(),
  c: z.number().finite(),
  sampleStart: z.number().finite().optional(),
  sampleEnd: z.number().finite().optional(),
  sampleStep: z.number().finite().positive().optional(),
});
export type QuadraticInputSchema = z.infer<typeof quadraticInputSchema>;

// --- pricing ---
export const pricingInputSchema = z.object({
  baseCost: z.number().finite().nonnegative(),
  desiredMarginPct: z.number().finite().min(0).lt(1),
  taxPct: z.number().finite().nonnegative().optional(),
  quantity: z.number().finite().nonnegative().optional(),
  discountPct: z.number().finite().min(0).max(1).optional(),
  currency: z.string().optional(),
});
export type PricingInputSchema = z.infer<typeof pricingInputSchema>;

// --- roi ---
export const roiCashFlowSchema = z.object({
  period: z.number().int().positive(),
  amount: z.number().finite(),
});
export const roiInputSchema = z.object({
  initialInvestment: z.number().finite().nonnegative(),
  finalValue: z.number().finite().optional(),
  cashFlows: z.array(roiCashFlowSchema).optional(),
  periods: z.number().int().positive().optional(),
  discountRatePct: z.number().finite().nonnegative().optional(),
});
export type RoiInputSchema = z.infer<typeof roiInputSchema>;

// --- actuarial ---
export const actuarialMortalitySchema = z.object({
  age: z.number().finite().nonnegative(),
  premium: z.number().finite().nonnegative(),
  coverage: z.number().finite().nonnegative(),
  survivalTableId: z.string().optional(),
  mortalityProbability: z.number().finite().min(0).max(1).optional(),
});
export const actuarialInputSchema = z.object({
  principal: z.number().finite().nonnegative(),
  annualRatePct: z.number().finite().min(0).lt(1),
  periodsPerYear: z.number().finite().positive(),
  years: z.number().finite().nonnegative(),
  contributionPerPeriod: z.number().finite().nonnegative().optional(),
  mortality: actuarialMortalitySchema.optional(),
});
export type ActuarialInputSchema = z.infer<typeof actuarialInputSchema>;

// --- escenarios (API) ---
export const scenarioModuleSchema = z.enum(["quadratic", "pricing", "roi", "actuarial"]);
export const saveScenarioSchema = z.object({
  scopeId: z.string().min(1),
  module: scenarioModuleSchema,
  inputs: z.record(z.unknown()),
});
export type SaveScenarioSchema = z.infer<typeof saveScenarioSchema>;