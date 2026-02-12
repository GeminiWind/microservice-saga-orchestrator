export type FailureStage = "order" | "shipping" | "payment";

export function compensationSequence(stage: FailureStage): string[] {
  if (stage === "order") {
    return [];
  }
  if (stage === "shipping") {
    return ["ORDER_CANCEL"];
  }
  return ["SHIPPING_CANCEL", "ORDER_CANCEL"];
}
