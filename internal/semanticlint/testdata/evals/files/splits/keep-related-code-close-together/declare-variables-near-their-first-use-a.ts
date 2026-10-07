export type Payment = {
  readonly amountCents: number;
  readonly dueDateIso: string;
};

export const createPayment = (amountCents: number): Payment => {
  const dueDateIso = "2026-12-31";
  const normalizedAmountCents = Math.round(amountCents);
  const hasPositiveAmount = normalizedAmountCents > 0;
  const selectedAmountCents = hasPositiveAmount ? normalizedAmountCents : 0;
  const paymentId = `payment-${selectedAmountCents}`;
  const amountWithId = { paymentId, selectedAmountCents };
  const recordedAmountCents = amountWithId.selectedAmountCents;
  return { amountCents: recordedAmountCents, dueDateIso };
};
