export type RefundRequest = {
  readonly daysSincePurchase: number;
  readonly totalCents: number;
};

export const refundAmountCents = (request: RefundRequest): number => {
  const isWithinRefundWindow = request.daysSincePurchase <= 30;
  return isWithinRefundWindow ? request.totalCents : 0;
};

export const createRefundRequest = (
  daysSincePurchase: number,
  totalCents: number,
): RefundRequest => ({
  daysSincePurchase,
  totalCents,
});
