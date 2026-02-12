import { describe, expect, it } from "vitest";

const integrationEnabled = process.env.RUN_INTEGRATION === "1";

async function waitForSaga(sagaId: string, expected: string): Promise<Record<string, unknown>> {
  const timeoutMs = 20000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`http://localhost:3000/sagas/${sagaId}`);
    if (res.ok) {
      const body = (await res.json()) as Record<string, unknown>;
      if (body.status === expected) {
        return body;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for saga ${sagaId} => ${expected}`);
}

describe.skipIf(!integrationEnabled)("orchestrator saga integration", () => {
  it("completes happy path", async () => {
    const res = await fetch("http://localhost:3001/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId: "cust-1",
        items: [{ sku: "sku-1", qty: 2, price: 20 }],
        shippingAddress: "123 Main St",
        paymentMethodToken: "pm_card_visa"
      })
    });

    expect(res.status).toBe(202);
    const { sagaId } = (await res.json()) as { sagaId: string };
    const saga = await waitForSaga(sagaId, "COMPLETED");
    expect(saga.status).toBe("COMPLETED");
  }, 30000);

  it("rolls back on shipping failure", async () => {
    const res = await fetch("http://localhost:3001/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId: "cust-2",
        items: [{ sku: "sku-2", qty: 1, price: 10 }],
        shippingAddress: "456 Main St",
        paymentMethodToken: "pm_card_visa",
        failAt: "shipping"
      })
    });

    expect(res.status).toBe(202);
    const { sagaId } = (await res.json()) as { sagaId: string };
    const saga = await waitForSaga(sagaId, "FAILED_COMPENSATED");
    expect(saga.status).toBe("FAILED_COMPENSATED");
  }, 30000);

  it("rolls back on payment failure", async () => {
    const res = await fetch("http://localhost:3001/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId: "cust-3",
        items: [{ sku: "sku-3", qty: 1, price: 99 }],
        shippingAddress: "789 Main St",
        paymentMethodToken: "pm_card_visa",
        failAt: "payment"
      })
    });

    expect(res.status).toBe(202);
    const { sagaId } = (await res.json()) as { sagaId: string };
    const saga = await waitForSaga(sagaId, "FAILED_COMPENSATED");
    expect(saga.status).toBe("FAILED_COMPENSATED");
  }, 30000);
});
