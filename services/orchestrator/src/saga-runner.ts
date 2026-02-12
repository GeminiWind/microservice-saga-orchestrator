import {
  CancelPayload,
  createEnvelope,
  MessageEnvelope,
  OrderCreateFailedPayload,
  OrderCreatedPayload,
  PaymentChargePayload,
  PaymentChargedPayload,
  publishMessage,
  ROUTING_KEYS,
  ShippingCreatePayload,
  ShippingCreatedPayload
} from "@app/common";
import { Channel } from "amqplib";
import { SagaStore } from "./saga-store";

export class SagaRunner {
  constructor(
    private readonly channel: Channel,
    private readonly sagaStore: SagaStore
  ) {}

  async handleOrderCreated(event: MessageEnvelope<OrderCreatedPayload>): Promise<void> {
    const existing = this.sagaStore.get(event.sagaId);
    const shippingStepAlreadySent = existing?.steps.some((step) => step.step === "SHIPPING_CREATE") ?? false;
    if (shippingStepAlreadySent) {
      return;
    }

    if (!existing) {
      this.sagaStore.create(
        event.sagaId,
        {
          customerId: event.payload.customerId,
          items: event.payload.items,
          shippingAddress: event.payload.shippingAddress,
          paymentMethodToken: event.payload.paymentMethodToken,
          totalAmount: event.payload.totalAmount,
          failAt: event.payload.failAt,
          orderId: event.payload.orderId
        },
        "PENDING_SHIPPING"
      );
      this.sagaStore.addStep(event.sagaId, "ORDER_CREATE", "SUCCEEDED", event.payload, event.messageId);
    } else {
      if (!existing.context.orderId) {
        this.sagaStore.setContextValue(event.sagaId, "orderId", event.payload.orderId);
      }
      const hasOrderCreateSuccess = existing.steps.some((step) => step.step === "ORDER_CREATE" && step.status === "SUCCEEDED");
      if (!hasOrderCreateSuccess) {
        this.sagaStore.addStep(event.sagaId, "ORDER_CREATE", "SUCCEEDED", event.payload, event.messageId);
      }
      if (existing.status === "PENDING_ORDER") {
        this.sagaStore.updateStatus(event.sagaId, "PENDING_SHIPPING");
      }
    }

    const saga = this.mustGet(event.sagaId);
    const command = createEnvelope<ShippingCreatePayload>({
      sagaId: event.sagaId,
      type: "ShippingCreateCommand",
      payload: {
        orderId: event.payload.orderId,
        address: saga.context.shippingAddress,
        failAt: saga.context.failAt
      }
    });

    this.sagaStore.addStep(event.sagaId, "SHIPPING_CREATE", "SENT", command.payload, command.messageId);
    await publishMessage(this.channel, ROUTING_KEYS.shippingCreate, command);
  }

  async handleOrderCreateFailed(event: MessageEnvelope<OrderCreateFailedPayload>): Promise<void> {
    const existing = this.sagaStore.get(event.sagaId);
    if (!existing) {
      this.sagaStore.create(
        event.sagaId,
        {
          customerId: event.payload.customerId,
          items: event.payload.items,
          shippingAddress: event.payload.shippingAddress,
          paymentMethodToken: event.payload.paymentMethodToken,
          totalAmount: event.payload.totalAmount,
          failAt: event.payload.failAt
        },
        "FAILED_COMPENSATED"
      );
    }

    this.sagaStore.addStep(event.sagaId, "ORDER_CREATE", "FAILED", { reason: event.payload.reason }, event.messageId);
    this.sagaStore.setError(event.sagaId, event.payload.reason);
    this.sagaStore.updateStatus(event.sagaId, "FAILED_COMPENSATED");
  }

  async handleShippingCreated(event: MessageEnvelope<ShippingCreatedPayload>): Promise<void> {
    this.sagaStore.setContextValue(event.sagaId, "shipmentId", event.payload.shipmentId);
    this.sagaStore.addStep(event.sagaId, "SHIPPING_CREATE", "SUCCEEDED", event.payload, event.messageId);
    this.sagaStore.updateStatus(event.sagaId, "PENDING_PAYMENT");

    const saga = this.mustGet(event.sagaId);
    const command = createEnvelope<PaymentChargePayload>({
      sagaId: event.sagaId,
      type: "PaymentChargeCommand",
      payload: {
        orderId: event.payload.orderId,
        amount: saga.context.totalAmount,
        paymentMethodToken: saga.context.paymentMethodToken,
        failAt: saga.context.failAt
      }
    });

    this.sagaStore.addStep(event.sagaId, "PAYMENT_CHARGE", "SENT", command.payload, command.messageId);
    await publishMessage(this.channel, ROUTING_KEYS.paymentCharge, command);
  }

  async handleShippingCreateFailed(event: MessageEnvelope<{ reason: string }>): Promise<void> {
    this.sagaStore.addStep(event.sagaId, "SHIPPING_CREATE", "FAILED", event.payload, event.messageId);
    this.sagaStore.setError(event.sagaId, event.payload.reason);
    this.sagaStore.updateStatus(event.sagaId, "COMPENSATING_ORDER");

    const saga = this.mustGet(event.sagaId);
    if (!saga.context.orderId) {
      this.sagaStore.updateStatus(event.sagaId, "FAILED_COMPENSATION_PENDING");
      return;
    }

    const command = createEnvelope<CancelPayload>({
      sagaId: event.sagaId,
      type: "OrderCancelCommand",
      payload: {
        orderId: saga.context.orderId
      }
    });

    this.sagaStore.addStep(event.sagaId, "ORDER_CANCEL", "SENT", command.payload, command.messageId);
    await publishMessage(this.channel, ROUTING_KEYS.orderCancel, command);
  }

  async handleShippingCancelled(event: MessageEnvelope<{ shipmentId: string; orderId: string }>): Promise<void> {
    this.sagaStore.addStep(event.sagaId, "SHIPPING_CANCEL", "COMPENSATED", event.payload, event.messageId);
    this.sagaStore.updateStatus(event.sagaId, "COMPENSATING_ORDER");

    const saga = this.mustGet(event.sagaId);
    if (!saga.context.orderId) {
      this.sagaStore.updateStatus(event.sagaId, "FAILED_COMPENSATION_PENDING");
      return;
    }

    const command = createEnvelope<CancelPayload>({
      sagaId: event.sagaId,
      type: "OrderCancelCommand",
      payload: {
        orderId: saga.context.orderId
      }
    });

    this.sagaStore.addStep(event.sagaId, "ORDER_CANCEL", "SENT", command.payload, command.messageId);
    await publishMessage(this.channel, ROUTING_KEYS.orderCancel, command);
  }

  async handleOrderCancelled(event: MessageEnvelope<{ orderId: string }>): Promise<void> {
    this.sagaStore.addStep(event.sagaId, "ORDER_CANCEL", "COMPENSATED", event.payload, event.messageId);
    this.sagaStore.updateStatus(event.sagaId, "FAILED_COMPENSATED");
  }

  async handlePaymentCharged(event: MessageEnvelope<PaymentChargedPayload>): Promise<void> {
    this.sagaStore.setContextValue(event.sagaId, "paymentId", event.payload.paymentId);
    this.sagaStore.addStep(event.sagaId, "PAYMENT_CHARGE", "SUCCEEDED", event.payload, event.messageId);
    this.sagaStore.updateStatus(event.sagaId, "COMPLETED");
  }

  async handlePaymentChargeFailed(event: MessageEnvelope<{ reason: string }>): Promise<void> {
    this.sagaStore.addStep(event.sagaId, "PAYMENT_CHARGE", "FAILED", event.payload, event.messageId);
    this.sagaStore.setError(event.sagaId, event.payload.reason);
    this.sagaStore.updateStatus(event.sagaId, "COMPENSATING_SHIPPING");

    const saga = this.mustGet(event.sagaId);
    if (!saga.context.orderId) {
      this.sagaStore.updateStatus(event.sagaId, "FAILED_COMPENSATION_PENDING");
      return;
    }

    const shippingCancelCommand = createEnvelope<CancelPayload>({
      sagaId: event.sagaId,
      type: "ShippingCancelCommand",
      payload: {
        orderId: saga.context.orderId
      }
    });

    this.sagaStore.addStep(
      event.sagaId,
      "SHIPPING_CANCEL",
      "SENT",
      shippingCancelCommand.payload,
      shippingCancelCommand.messageId
    );
    await publishMessage(this.channel, ROUTING_KEYS.shippingCancel, shippingCancelCommand);
  }

  async retryCompensation(sagaId: string): Promise<void> {
    const saga = this.mustGet(sagaId);
    if (saga.status !== "FAILED_COMPENSATION_PENDING") {
      throw new Error(`Saga ${sagaId} is not awaiting manual compensation`);
    }

    if (saga.context.orderId) {
      const command = createEnvelope<CancelPayload>({
        sagaId,
        type: "OrderCancelCommand",
        payload: { orderId: saga.context.orderId }
      });
      this.sagaStore.updateStatus(sagaId, "COMPENSATING_ORDER");
      this.sagaStore.addStep(sagaId, "ORDER_CANCEL", "SENT", command.payload, command.messageId);
      await publishMessage(this.channel, ROUTING_KEYS.orderCancel, command);
      return;
    }

    throw new Error(`Saga ${sagaId} has no compensatable resources`);
  }

  private mustGet(sagaId: string) {
    const record = this.sagaStore.get(sagaId);
    if (!record) {
      throw new Error(`Saga ${sagaId} does not exist`);
    }
    return record;
  }
}
