import dotenv from "dotenv";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import {
  connectWithRetry,
  consumeWithRetry,
  createOrderSchema,
  envelopeSchema,
  MessageEnvelope,
  QUEUES,
  setupBaseTopology
} from "@app/common";
import { createPool, runMigrations } from "./db";
import { OrderHandlers } from "./handlers";

dotenv.config();

async function main() {
  const rabbitmqUrl = process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672";
  const maxRetries = Number(process.env.MAX_RETRIES ?? "3");
  const port = Number(process.env.ORDER_SERVICE_PORT ?? "3001");

  const pool = createPool();
  await runMigrations(pool);

  const conn = await connectWithRetry(rabbitmqUrl);
  const channel = await conn.createChannel();
  await setupBaseTopology(channel);

  const handlers = new OrderHandlers(pool, channel);

  await consumeWithRetry({
    channel,
    queue: QUEUES.orderCommands,
    maxRetries,
    handler: async (msg) => {
      const raw = JSON.parse(msg.content.toString("utf-8"));
      const envelope = envelopeSchema.parse(raw) as MessageEnvelope<Record<string, unknown>>;

      if (envelope.type === "OrderCancelCommand") {
        await handlers.handleOrderCancel(envelope as MessageEnvelope<{ orderId: string }>);
      }
    }
  });

  const app = express();
  app.use(express.json());

  app.post("/orders", async (req, res) => {
    try {
      const body = createOrderSchema.parse(req.body);
      const sagaId = uuidv4();
      await handlers.createOrderFromRequest({
        sagaId,
        customerId: body.customerId,
        items: body.items,
        shippingAddress: body.shippingAddress,
        paymentMethodToken: body.paymentMethodToken,
        failAt: body.failAt
      });

      res.status(202).json({ sagaId, status: "PENDING_SHIPPING" });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`order-service listening on ${port}`);
  });
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("order-service startup error", error);
  process.exit(1);
});
