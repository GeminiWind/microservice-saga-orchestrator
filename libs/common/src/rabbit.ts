import amqp, { Channel, ChannelModel, ConsumeMessage, Message } from "amqplib";
import { EXCHANGE, QUEUES, ROUTING_KEYS } from "./messages";

export async function connectWithRetry(url: string, retries = 30, delayMs = 2000): Promise<ChannelModel> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await amqp.connect(url);
    } catch (error) {
      attempt += 1;
      if (attempt >= retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Unable to connect to RabbitMQ");
}

export async function setupBaseTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(EXCHANGE, "topic", { durable: true });

  await assertQueueWithDlq(channel, QUEUES.orderCommands);
  await assertQueueWithDlq(channel, QUEUES.shippingCommands);
  await assertQueueWithDlq(channel, QUEUES.paymentCommands);
  await assertQueueWithDlq(channel, QUEUES.orchestratorEvents);

  await channel.bindQueue(QUEUES.orderCommands, EXCHANGE, ROUTING_KEYS.orderCancel);

  await channel.bindQueue(QUEUES.shippingCommands, EXCHANGE, ROUTING_KEYS.shippingCreate);
  await channel.bindQueue(QUEUES.shippingCommands, EXCHANGE, ROUTING_KEYS.shippingCancel);

  await channel.bindQueue(QUEUES.paymentCommands, EXCHANGE, ROUTING_KEYS.paymentCharge);
  await channel.bindQueue(QUEUES.paymentCommands, EXCHANGE, ROUTING_KEYS.paymentRefund);

  await channel.bindQueue(QUEUES.orchestratorEvents, EXCHANGE, "event.#");
}

export async function assertQueueWithDlq(channel: Channel, queueName: string): Promise<void> {
  const dlqName = `${queueName}.dlq`;
  await channel.assertQueue(dlqName, { durable: true });
  await channel.assertQueue(queueName, {
    durable: true,
    deadLetterExchange: "",
    deadLetterRoutingKey: dlqName
  });
}

export async function publishMessage<T>(
  channel: Channel,
  routingKey: string,
  message: T,
  headers: Record<string, unknown> = {}
): Promise<void> {
  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(message)), {
    contentType: "application/json",
    persistent: true,
    headers
  });
}

export async function consumeWithRetry(args: {
  channel: Channel;
  queue: string;
  maxRetries: number;
  handler: (msg: ConsumeMessage) => Promise<void>;
}): Promise<void> {
  const { channel, queue, maxRetries, handler } = args;
  await channel.consume(queue, async (msg) => {
    if (!msg) {
      return;
    }

    try {
      await handler(msg);
      channel.ack(msg);
    } catch (error) {
      const retries = readRetryCount(msg);
      if (retries < maxRetries) {
        await requeueWithRetryHeader(channel, queue, msg, retries + 1);
      } else {
        channel.nack(msg, false, false);
      }
      // eslint-disable-next-line no-console
      console.error(`[${queue}] handler failed`, error);
    }
  });
}

function readRetryCount(msg: Message): number {
  const value = msg.properties.headers?.["x-retry"];
  return typeof value === "number" ? value : 0;
}

async function requeueWithRetryHeader(channel: Channel, queue: string, msg: Message, retryCount: number): Promise<void> {
  channel.sendToQueue(queue, msg.content, {
    contentType: msg.properties.contentType,
    persistent: true,
    headers: {
      ...(msg.properties.headers ?? {}),
      "x-retry": retryCount
    }
  });
  channel.ack(msg);
}
