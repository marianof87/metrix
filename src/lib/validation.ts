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

// --- lead-magnet (contrato honesto OBJ-2) ---
export const leadMagnetInputSchema = z
  .object({
    minPrice: z.number().finite(),
    maxPrice: z.number().finite(),
    demandA: z.number().finite(),
    demandB: z.number().finite(),
    demandC: z.number().finite(),
    costPerUnit: z.number().finite(),
  })
  .refine((v) => v.demandA < 0, {
    message: "Invalid input",
    path: ["demandA"],
  })
  .refine((v) => v.maxPrice > v.minPrice, {
    message: "Invalid input",
    path: ["maxPrice"],
  })
  .refine((v) => v.costPerUnit >= 0, {
    message: "Invalid input",
    path: ["costPerUnit"],
  });
export type LeadMagnetInputSchema = z.infer<typeof leadMagnetInputSchema>;

// --- lead (captura de contacto para informe PDF) ---
export const leadSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  empresa: z.string().trim().min(1).max(120),
  whatsapp: z.string().trim().min(6).max(20),
  email: z.string().trim().email().max(120),
});
export type LeadInputSchema = z.infer<typeof leadSchema>;

// --- margen (T1 de Metrix AI) ---
export const margenInputSchema = z
  .object({
    precioVenta: z.number().finite().positive(),
    comisionPct: z.number().finite().min(0).lt(1),
    mermaPct: z.number().finite().min(0).lt(1),
    ivaPct: z.number().finite().min(0).lt(1),
    fleteUnitario: z.number().finite().nonnegative(),
    costoUnitario: z.number().finite().nonnegative(),
    costosFijosMensuales: z.number().finite().nonnegative().optional(),
  })
  .refine((v) => v.comisionPct + v.mermaPct + v.ivaPct < 1 - 1e-9, {
    message: "la suma de comisionPct + mermaPct + ivaPct debe ser menor que 1",
    path: ["comisionPct"],
  });
export type MargenInputSchema = z.infer<typeof margenInputSchema>;

// --- auth (Fase 5b) ---
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  name: z.string().trim().max(80).optional().nullable(),
  password: z.string().min(8).max(128),
});
export type RegisterSchema = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(1).max(128),
});
export type LoginSchema = z.infer<typeof loginSchema>;