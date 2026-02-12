export type SagaStatus =
  | "PENDING_ORDER"
  | "PENDING_SHIPPING"
  | "PENDING_PAYMENT"
  | "COMPENSATING_SHIPPING"
  | "COMPENSATING_ORDER"
  | "COMPLETED"
  | "FAILED_COMPENSATED"
  | "FAILED_COMPENSATION_PENDING";

export type SagaStepStatus = "SENT" | "SUCCEEDED" | "FAILED" | "COMPENSATED";

export interface SagaStep {
  step: string;
  status: SagaStepStatus;
  timestamp: string;
  messageId?: string;
  details?: unknown;
}

export interface SagaContext {
  customerId: string;
  items: Array<{ sku: string; qty: number; price: number }>;
  shippingAddress: string;
  paymentMethodToken: string;
  totalAmount: number;
  failAt?: "order" | "shipping" | "payment";
  orderId?: string;
  shipmentId?: string;
  paymentId?: string;
}

export interface SagaRecord {
  sagaId: string;
  status: SagaStatus;
  createdAt: string;
  updatedAt: string;
  steps: SagaStep[];
  context: SagaContext;
  error?: string;
}
