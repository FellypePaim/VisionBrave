/**
 * Schemas Zod para validar inputs das APIs admin.
 *
 * Toda Route Handler que aceita body DEVE chamar `schema.parse(body)`
 * antes de processar — Zod throw em input inválido, capturado pelo
 * `adminErrorResponse`.
 */

import { z } from "zod";

export const creditAdjustSchema = z.object({
  userId: z.string().uuid(),
  operation: z.enum(["add", "remove", "refund"]),
  amount: z.number().int().positive().max(1_000_000),
  reason: z.string().min(10).max(500),
  referenceId: z.string().optional(),
  // Pra ajustes acima de 5000 créditos, exige confirmação digitando o email do alvo
  confirmTargetEmail: z.string().email().optional(),
});

export const subscriptionUpdateSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["free", "starter", "premium", "premiumplus", "pro", "enterprise"]).optional(),
  status: z.enum(["active", "canceled", "past_due", "trialing", "incomplete"]).optional(),
  reason: z.string().min(5).max(500),
});

export const userBlockSchema = z.object({
  userId: z.string().uuid(),
  blocked: z.boolean(),
  reason: z.string().min(10).max(500),
  // Exige confirmação por email pra banir
  confirmTargetEmail: z.string().email().optional(),
});

export const kieCapUpdateSchema = z.object({
  newCapBRL: z.number().positive().max(10_000),
  reason: z.string().min(10).max(500),
});

export const systemSettingsUpdateSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
  reason: z.string().min(5).max(500).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
});

export type CreditAdjustPayload = z.infer<typeof creditAdjustSchema>;
export type SubscriptionUpdatePayload = z.infer<typeof subscriptionUpdateSchema>;
export type UserBlockPayload = z.infer<typeof userBlockSchema>;
export type KieCapUpdatePayload = z.infer<typeof kieCapUpdateSchema>;
export type SystemSettingsUpdatePayload = z.infer<typeof systemSettingsUpdateSchema>;
