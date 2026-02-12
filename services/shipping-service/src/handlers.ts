import { Channel } from "amqplib";
import {
  createEnvelope,
  FailurePayload,
  MessageEnvelope,
  publishMessage,
  ROUTING_KEYS,
  ShippingCreatePayload,
  ShippingCreatedPayload
} from "@app/common";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

export class ShippingHandlers {
  constructor(
    private readonly pool: Pool,
    private readonly channel: Channel
  ) {}

  async handleShippingCreate(msg: MessageEnvelope<ShippingCreatePayload>): Promise<void> {
    if (msg.payload.failAt === "shipping") {
      await this.publishFailure(msg.sagaId, "ShippingCreateFailedEvent", ROUTING_KEYS.eventShippingCreateFailed, "Simulated shipping failure");
      return;
    }

    const existing = await this.pool.query<{ id: string; order_id: string }>(
      "SELECT id, order_id FROM shipments WHERE saga_id = $1",
      [msg.sagaId]
    );

    if (existing.rowCount && existing.rows[0]) {
      const event = createEnvelope<ShippingCreatedPayload>({
        sagaId: msg.sagaId,
        type: "ShippingCreatedEvent",
        payload: {
          shipmentId: existing.rows[0].id,
          orderId: existing.rows[0].order_id
        }
      });
      await publishMessage(this.channel, ROUTING_KEYS.eventShippingCreated, event);
      return;
    }

    const shipmentId = uuidv4();
    await this.pool.query(
      `INSERT INTO shipments (id, saga_id, order_id, address, status)
       VALUES ($1, $2, $3, $4, 'CREATED')`,
      [shipmentId, msg.sagaId, msg.payload.orderId, msg.payload.address]
    );

    const event = createEnvelope<ShippingCreatedPayload>({
      sagaId: msg.sagaId,
      type: "ShippingCreatedEvent",
      payload: {
        shipmentId,
        orderId: msg.payload.orderId
      }
    });
    await publishMessage(this.channel, ROUTING_KEYS.eventShippingCreated, event);
  }

  async handleShippingCancel(msg: MessageEnvelope<{ orderId: string }>): Promise<void> {
    const existing = await this.pool.query<{ id: string; order_id: string }>(
      "SELECT id, order_id FROM shipments WHERE saga_id = $1",
      [msg.sagaId]
    );

    await this.pool.query(
      `UPDATE shipments
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE saga_id = $1 AND status <> 'CANCELLED'`,
      [msg.sagaId]
    );

    const event = createEnvelope({
      sagaId: msg.sagaId,
      type: "ShippingCancelledEvent",
      payload: {
        shipmentId: existing.rows[0]?.id ?? "unknown",
        orderId: msg.payload.orderId
      }
    });
    await publishMessage(this.channel, ROUTING_KEYS.eventShippingCancelled, event);
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
