import { describe, expect, it } from "vitest";
import { createEnvelope } from "./messages";
import { createOrderSchema, envelopeSchema } from "./validation";

describe("validation", () => {
  it("validates create order payload", () => {
    const body = {
      customerId: "cust-1",
      items: [{ sku: "sku-1", qty: 2, price: 10 }],
      shippingAddress: "hcm city",
      paymentMethodToken: "pm_123"
    };

    expect(() => createOrderSchema.parse(body)).not.toThrow();
  });

  it("validates envelope contract", () => {
    const envelope = createEnvelope({
      sagaId: "d2d9a4a4-56d2-4d11-a30a-9f9d8c8cb001",
      type: "OrderCreatedEvent",
      payload: { orderId: "o-1", customerId: "x", totalAmount: 50 }
    });

    expect(() => envelopeSchema.parse(envelope)).not.toThrow();
  });
});
