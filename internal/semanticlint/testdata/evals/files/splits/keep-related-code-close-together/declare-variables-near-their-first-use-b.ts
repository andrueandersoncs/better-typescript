export type Payment = {
  readonly amountCents: number;
  readonly dueDateIso: string;
};

export const createPayment = (amountCents: number): Payment => {
  const normalizedAmountCents = Math.round(amountCents);
  const hasPositiveAmount = normalizedAmountCents > 0;
  const selectedAmountCents = hasPositiveAmount ? normalizedAmountCents : 0;
  const paymentId = `payment-${selectedAmountCents}`;
  const amountWithId = { paymentId, selectedAmountCents };
  const recordedAmountCents = amountWithId.selectedAmountCents;
  const dueDateIso = "2026-12-31";
  return { amountCents: recordedAmountCents, dueDateIso };
};
