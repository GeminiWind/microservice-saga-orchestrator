import dotenv from "dotenv";
import {
  connectWithRetry,
  consumeWithRetry,
  envelopeSchema,
  MessageEnvelope,
  QUEUES,
  setupBaseTopology
} from "@app/common";
import { createPool, runMigrations } from "./db";
import { PaymentHandlers } from "./handlers";

dotenv.config();

async function main() {
  const rabbitmqUrl = process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672";
  const maxRetries = Number(process.env.MAX_RETRIES ?? "3");

  const pool = createPool();
  await runMigrations(pool);

  const conn = await connectWithRetry(rabbitmqUrl);
  const channel = await conn.createChannel();
  await setupBaseTopology(channel);

  const handlers = new PaymentHandlers(pool, channel);

  await consumeWithRetry({
    channel,
    queue: QUEUES.paymentCommands,
    maxRetries,
    handler: async (msg) => {
      const raw = JSON.parse(msg.content.toString("utf-8"));
      const envelope = envelopeSchema.parse(raw) as MessageEnvelope<Record<string, unknown>>;

      if (envelope.type === "PaymentChargeCommand") {
        await handlers.handlePaymentCharge(
          envelope as MessageEnvelope<{ orderId: string; amount: number; paymentMethodToken: string; failAt?: "order" | "shipping" | "payment" }>
        );
      } else if (envelope.type === "PaymentRefundCommand") {
        await handlers.handlePaymentRefund(envelope as MessageEnvelope<{ orderId: string }>);
      }
    }
  });

  // eslint-disable-next-line no-console
  console.log("payment-service listening for commands");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("payment-service startup error", error);
  process.exit(1);
});
