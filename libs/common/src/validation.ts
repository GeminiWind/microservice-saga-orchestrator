import { z } from "zod";

export const orderItemSchema = z.object({
  sku: z.string().min(1),
  qty: z.number().int().positive(),
  price: z.number().positive()
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  shippingAddress: z.string().min(1),
  paymentMethodToken: z.string().min(1),
  failAt: z.enum(["order", "shipping", "payment"]).optional()
});

export const envelopeSchema = z.object({
  messageId: z.string().uuid(),
  correlationId: z.string().uuid(),
  sagaId: z.string().uuid(),
  type: z.string().min(1),
  timestamp: z.string().datetime(),
  payload: z.record(z.string(), z.unknown())
});
