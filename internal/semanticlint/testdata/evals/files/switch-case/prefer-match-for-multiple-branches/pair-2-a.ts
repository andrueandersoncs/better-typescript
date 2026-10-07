type BillingEvent =
  | { readonly _tag: "ChargeCreated"; readonly invoiceId: string }
  | { readonly _tag: "ChargeSettled"; readonly invoiceId: string }
  | { readonly _tag: "ChargeRejected"; readonly reason: string };

export const auditDescription = (event: BillingEvent): string => {
  if (event._tag === "ChargeCreated") {
    return `Created ${event.invoiceId}`;
  } else if (event._tag === "ChargeSettled") {
    return `Settled ${event.invoiceId}`;
  } else {
    return `Rejected ${event.reason}`;
  }
};
