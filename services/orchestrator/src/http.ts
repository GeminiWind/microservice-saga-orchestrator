import express from "express";
import { SagaRunner } from "./saga-runner";
import { SagaStore } from "./saga-store";

export function createHttpServer(sagaStore: SagaStore, sagaRunner: SagaRunner) {
  const app = express();
  app.use(express.json());

  app.get("/sagas/:sagaId", (req, res) => {
    const saga = sagaStore.get(req.params.sagaId);
    if (!saga) {
      res.status(404).json({ error: "Saga not found" });
      return;
    }
    res.json(saga);
  });

  app.post("/sagas/:sagaId/retry-compensation", async (req, res) => {
    try {
      await sagaRunner.retryCompensation(req.params.sagaId);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  return app;
}
