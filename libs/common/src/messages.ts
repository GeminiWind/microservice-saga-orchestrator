import { v4 as uuidv4 } from "uuid";

export const EXCHANGE = "saga.exchange";

export const QUEUES = {
  orderCommands: "order.commands",
  shippingCommands: "shipping.commands",
  paymentCommands: "payment.commands",
  orchestratorEvents: "orchestrator.events"
} as const;

export const ROUTING_KEYS = {
  orderCancel: "command.order.cancel",
  shippingCreate: "command.shipping.create",
  shippingCancel: "command.shipping.cancel",
  paymentCharge: "command.payment.charge",
  paymentRefund: "command.payment.refund",
  eventOrderCreated: "event.order.created",
  eventOrderCreateFailed: "event.order.create_failed",
  eventOrderCancelled: "event.order.cancelled",
  eventShippingCreated: "event.shipping.created",
  eventShippingCreateFailed: "event.shipping.create_failed",
  eventShippingCancelled: "event.shipping.cancelled",
  eventPaymentCharged: "event.payment.charged",
  eventPaymentChargeFailed: "event.payment.charge_failed",
  eventPaymentRefunded: "event.payment.refunded"
} as const;

export interface MessageEnvelope<T> {
  messageId: string;
  correlationId: string;
  sagaId: string;
  type: string;
  timestamp: string;
  payload: T;
}

export interface OrderCreatePayload {
  customerId: string;
  totalAmount: number;
  failAt?: "order" | "shipping" | "payment";
}

export interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
  totalAmount: number;
  shippingAddress: string;
  paymentMethodToken: string;
  items: Array<{ sku: string; qty: number; price: number }>;
  failAt?: "order" | "shipping" | "payment";
}

export interface OrderCreateFailedPayload {
  reason: string;
  customerId: string;
  totalAmount: number;
  shippingAddress: string;
  paymentMethodToken: string;
  items: Array<{ sku: string; qty: number; price: number }>;
  failAt?: "order" | "shipping" | "payment";
}

export interface ShippingCreatePayload {
  orderId: string;
  address: string;
  failAt?: "order" | "shipping" | "payment";
}

export interface ShippingCreatedPayload {
  shipmentId: string;
  orderId: string;
}

export interface PaymentChargePayload {
  orderId: string;
  amount: number;
  paymentMethodToken: string;
  failAt?: "order" | "shipping" | "payment";
}

export interface PaymentChargedPayload {
  paymentId: string;
  orderId: string;
}

export interface FailurePayload {
  reason: string;
}

export interface CancelPayload {
  orderId: string;
}

export interface RefundPayload {
  orderId: string;
}

export function createEnvelope<T>(args: {
  sagaId: string;
  type: string;
  payload: T;
}): MessageEnvelope<T> {
  return {
    messageId: uuidv4(),
    correlationId: args.sagaId,
    sagaId: args.sagaId,
    type: args.type,
    timestamp: new Date().toISOString(),
    payload: args.payload
  };
}
