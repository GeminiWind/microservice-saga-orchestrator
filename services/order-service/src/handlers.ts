import { Channel } from "amqplib";
import {
  createEnvelope,
  MessageEnvelope,
  OrderCreateFailedPayload,
  OrderCreatedPayload,
  publishMessage,
  ROUTING_KEYS
} from "@app/common";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

interface CreateOrderRequest {
  sagaId: string;
  customerId: string;
  items: Array<{ sku: string; qty: number; price: number }>;
  shippingAddress: string;
  paymentMethodToken: string;
  failAt?: "order" | "shipping" | "payment";
}

export class OrderHandlers {
  constructor(
    private readonly pool: Pool,
    private readonly channel: Channel
  ) {}

  async createOrderFromRequest(input: CreateOrderRequest): Promise<{ sagaId: string; orderId?: string }> {
    const totalAmount = input.items.reduce((sum, item) => sum + item.qty * item.price, 0);

    if (input.failAt === "order") {
      const event = createEnvelope<OrderCreateFailedPayload>({
        sagaId: input.sagaId,
        type: "OrderCreateFailedEvent",
        payload: {
          reason: "Simulated order failure",
          customerId: input.customerId,
          totalAmount,
          shippingAddress: input.shippingAddress,
          paymentMethodToken: input.paymentMethodToken,
          items: input.items,
          failAt: input.failAt
        }
      });
      await publishMessage(this.channel, ROUTING_KEYS.eventOrderCreateFailed, event);
      return { sagaId: input.sagaId };
    }

    const existing = await this.pool.query<{ id: string }>("SELECT id FROM orders WHERE saga_id = $1", [input.sagaId]);

    const orderId = existing.rows[0]?.id ?? uuidv4();
    if (!existing.rowCount) {
      await this.pool.query(
        `INSERT INTO orders (id, saga_id, customer_id, total_amount, status)
         VALUES ($1, $2, $3, $4, 'CREATED')`,
        [orderId, input.sagaId, input.customerId, totalAmount]
      );
    }

    const event = createEnvelope<OrderCreatedPayload>({
      sagaId: input.sagaId,
      type: "OrderCreatedEvent",
      payload: {
        orderId,
        customerId: input.customerId,
        totalAmount,
        shippingAddress: input.shippingAddress,
        paymentMethodToken: input.paymentMethodToken,
        items: input.items,
        failAt: input.failAt
      }
    });
    await publishMessage(this.channel, ROUTING_KEYS.eventOrderCreated, event);

    return { sagaId: input.sagaId, orderId };
  }

  async handleOrderCancel(msg: MessageEnvelope<{ orderId: string }>): Promise<void> {
    await this.pool.query(
      `UPDATE orders
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE saga_id = $1 AND status <> 'CANCELLED'`,
      [msg.sagaId]
    );

    const event = createEnvelope({
      sagaId: msg.sagaId,
      type: "OrderCancelledEvent",
      payload: { orderId: msg.payload.orderId }
    });
    await publishMessage(this.channel, ROUTING_KEYS.eventOrderCancelled, event);
  }
}
