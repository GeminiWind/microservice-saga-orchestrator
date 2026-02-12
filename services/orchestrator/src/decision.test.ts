import { describe, expect, it } from "vitest";
import { compensationSequence } from "./decision";

describe("compensationSequence", () => {
  it("returns no compensation for order-stage failure", () => {
    expect(compensationSequence("order")).toEqual([]);
  });

  it("returns order cancel for shipping-stage failure", () => {
    expect(compensationSequence("shipping")).toEqual(["ORDER_CANCEL"]);
  });

  it("returns reverse-order compensation for payment-stage failure", () => {
    expect(compensationSequence("payment")).toEqual(["SHIPPING_CANCEL", "ORDER_CANCEL"]);
  });
});
