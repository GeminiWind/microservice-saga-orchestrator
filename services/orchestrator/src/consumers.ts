import { Channel, ConsumeMessage } from "amqplib";
import { consumeWithRetry, envelopeSchema, MessageEnvelope, QUEUES } from "@app/common";
import { SagaRunner } from "./saga-runner";

export async function registerOrchestratorConsumers(channel: Channel, sagaRunner: SagaRunner, maxRetries: number): Promise<void> {
  await consumeWithRetry({
    channel,
    queue: QUEUES.orchestratorEvents,
    maxRetries,
    handler: async (msg) => {
      const envelope = parseEnvelope(msg);
      await dispatchEvent(sagaRunner, envelope);
    }
  });
}

function parseEnvelope(msg: ConsumeMessage): MessageEnvelope<Record<string, unknown>> {
  const raw = JSON.parse(msg.content.toString("utf-8"));
  return envelopeSchema.parse(raw) as MessageEnvelope<Record<string, unknown>>;
}

async function dispatchEvent(sagaRunner: SagaRunner, envelope: MessageEnvelope<Record<string, unknown>>): Promise<void> {
  switch (envelope.type) {
    case "OrderCreatedEvent":
      await sagaRunner.handleOrderCreated(
        envelope as MessageEnvelope<{
          orderId: string;
          customerId: string;
          totalAmount: number;
          shippingAddress: string;
          paymentMethodToken: string;
          items: Array<{ sku: string; qty: number; price: number }>;
          failAt?: "order" | "shipping" | "payment";
        }>
      );
      break;
    case "OrderCreateFailedEvent":
      await sagaRunner.handleOrderCreateFailed(
        envelope as MessageEnvelope<{
          reason: string;
          customerId: string;
          totalAmount: number;
          shippingAddress: string;
          paymentMethodToken: string;
          items: Array<{ sku: string; qty: number; price: number }>;
          failAt?: "order" | "shipping" | "payment";
        }>
      );
      break;
    case "ShippingCreatedEvent":
      await sagaRunner.handleShippingCreated(envelope as MessageEnvelope<{ shipmentId: string; orderId: string }>);
      break;
    case "ShippingCreateFailedEvent":
      await sagaRunner.handleShippingCreateFailed(envelope as MessageEnvelope<{ reason: string }>);
      break;
    case "ShippingCancelledEvent":
      await sagaRunner.handleShippingCancelled(envelope as MessageEnvelope<{ shipmentId: string; orderId: string }>);
      break;
    case "PaymentChargedEvent":
      await sagaRunner.handlePaymentCharged(envelope as MessageEnvelope<{ paymentId: string; orderId: string }>);
      break;
    case "PaymentChargeFailedEvent":
      await sagaRunner.handlePaymentChargeFailed(envelope as MessageEnvelope<{ reason: string }>);
      break;
    case "OrderCancelledEvent":
      await sagaRunner.handleOrderCancelled(envelope as MessageEnvelope<{ orderId: string }>);
      break;
    default:
      break;
  }
}
