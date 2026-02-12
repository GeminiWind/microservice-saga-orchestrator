import dotenv from "dotenv";
import { connectWithRetry, setupBaseTopology } from "@app/common";
import { createHttpServer } from "./http";
import { SagaStore } from "./saga-store";
import { SagaRunner } from "./saga-runner";
import { registerOrchestratorConsumers } from "./consumers";

dotenv.config();

async function main() {
  const rabbitmqUrl = process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672";
  const maxRetries = Number(process.env.MAX_RETRIES ?? "3");
  const port = Number(process.env.ORCHESTRATOR_PORT ?? "3000");

  const conn = await connectWithRetry(rabbitmqUrl);
  const channel = await conn.createChannel();
  await setupBaseTopology(channel);

  const sagaStore = new SagaStore();
  const runner = new SagaRunner(channel, sagaStore);

  await registerOrchestratorConsumers(channel, runner, maxRetries);

  const app = createHttpServer(sagaStore, runner);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`orchestrator listening on ${port}`);
  });
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("orchestrator startup error", error);
  process.exit(1);
});
