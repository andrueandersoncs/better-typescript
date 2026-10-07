import { describe, expect, it } from "vitest";

type Invoice = {
  readonly status: "pending" | "paid";
};

const markInvoicePaid = (invoice: Invoice): Invoice => ({
  ...invoice,
  status: "paid",
});

describe("markInvoicePaid", () => {
  it("when pending, marks the invoice as paid", () => {
    const pendingInvoice: Invoice = { status: "pending" };
    const paidInvoice = markInvoicePaid(pendingInvoice);
    expect(paidInvoice.status).toBe("paid");
  });
});
