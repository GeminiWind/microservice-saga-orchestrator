import { describe, expect, it } from "vitest";
import { SagaStore } from "./saga-store";

describe("SagaStore", () => {
  it("creates and updates saga state", () => {
    const store = new SagaStore();
    const created = store.create("d2d9a4a4-56d2-4d11-a30a-9f9d8c8cb001", {
      customerId: "c1",
      items: [{ sku: "A", qty: 1, price: 5 }],
      shippingAddress: "street",
      paymentMethodToken: "tok_1",
      totalAmount: 5
    });

    expect(created.status).toBe("PENDING_ORDER");

    store.addStep(created.sagaId, "ORDER_CREATE", "SENT");
    store.updateStatus(created.sagaId, "PENDING_SHIPPING");

    const record = store.get(created.sagaId);
    expect(record?.steps).toHaveLength(1);
    expect(record?.status).toBe("PENDING_SHIPPING");
  });
});
