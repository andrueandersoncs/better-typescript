import { describe, expect, it } from "vitest"
import { formatInvoiceNumber } from "../src/formatInvoiceNumber"

describe("formatInvoiceNumber", () => {
  it("pads the invoice sequence to eight digits", () => {
    const invoice = {
      accountCode: "northwind",
      sequence: 42
    }

    expect(formatInvoiceNumber(invoice)).toBe("NORTHWIND-00000042")
  })
})
