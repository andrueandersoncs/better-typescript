import * as Match from "effect/Match";

type BillingEvent =
  | { readonly _tag: "ChargeCreated"; readonly invoiceId: string }
  | { readonly _tag: "ChargeSettled"; readonly invoiceId: string }
  | { readonly _tag: "ChargeRejected"; readonly reason: string };

export const auditDescription = (event: BillingEvent): string =>
  Match.value(event).pipe(
    Match.tag("ChargeCreated", ({ invoiceId }) => `Created ${invoiceId}`),
    Match.tag("ChargeSettled", ({ invoiceId }) => `Settled ${invoiceId}`),
    Match.tag("ChargeRejected", ({ reason }) => `Rejected ${reason}`),
    Match.exhaustive,
  );
