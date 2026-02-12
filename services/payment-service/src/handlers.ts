import { Channel } from "amqplib";
import {
  createEnvelope,
  FailurePayload,
  MessageEnvelope,
  PaymentChargePayload,
  PaymentChargedPayload,
  publishMessage,
  ROUTING_KEYS
} from "@app/common";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

export class PaymentHandlers {
  constructor(
    private readonly pool: Pool,
    private readonly channel: Channel
  ) {}

  async handlePaymentCharge(msg: MessageEnvelope<PaymentChargePayload>): Promise<void> {
    if (msg.payload.failAt === "payment") {
      await this.publishFailure(msg.sagaId, "PaymentChargeFailedEvent", ROUTING_KEYS.eventPaymentChargeFailed, "Simulated payment failure");
      return;
    }

    const existing = await this.pool.query<{ id: string; order_id: string }>(
      "SELECT id, order_id FROM payments WHERE saga_id = $1",
      [msg.sagaId]
    );

    if (existing.rowCount && existing.rows[0]) {
      const event = createEnvelope<PaymentChargedPayload>({
        sagaId: msg.sagaId,
        type: "PaymentChargedEvent",
        payload: {
          paymentId: existing.rows[0].id,
          orderId: existing.rows[0].order_id
        }
      });
      await publishMessage(this.channel, ROUTING_KEYS.eventPaymentCharged, event);
      return;
    }

    const paymentId = uuidv4();
    await this.pool.query(
      `INSERT INTO payments (id, saga_id, order_id, amount, method_token, status)
       VALUES ($1, $2, $3, $4, $5, 'CHARGED')`,
      [paymentId, msg.sagaId, msg.payload.orderId, msg.payload.amount, msg.payload.paymentMethodToken]
    );

    const event = createEnvelope<PaymentChargedPayload>({
      sagaId: msg.sagaId,
      type: "PaymentChargedEvent",
      payload: {
        paymentId,
        orderId: msg.payload.orderId
      }
    });
    await publishMessage(this.channel, ROUTING_KEYS.eventPaymentCharged, event);
  }

  async handlePaymentRefund(msg: MessageEnvelope<{ orderId: string }>): Promise<void> {
    await this.pool.query(
      `UPDATE payments
       SET status = 'REFUNDED', updated_at = NOW()
       WHERE saga_id = $1 AND status <> 'REFUNDED'`,
      [msg.sagaId]
    );

    const event = createEnvelope({
      sagaId: msg.sagaId,
      type: "PaymentRefundedEvent",
      payload: {
        orderId: msg.payload.orderId
      }
    });
    await publishMessage(this.channel, ROUTING_KEYS.eventPaymentRefunded, event);
  }

  private async publishFailure(sagaId: string, type: string, routingKey: string, reason: string): Promise<void> {
    const event = createEnvelope<FailurePayload>({
      sagaId,
      type,
      payload: { reason }
    });
    await publishMessage(this.channel, routingKey, event);
  }
}
