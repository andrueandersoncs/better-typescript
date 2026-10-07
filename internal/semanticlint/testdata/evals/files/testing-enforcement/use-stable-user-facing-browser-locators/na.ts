import { expect, test } from "vitest"

const toInvoiceNumber = (sequence: number) => `INV-${sequence.toString().padStart(4, "0")}`

test("pads an invoice sequence", () => {
  expect(toInvoiceNumber(23)).toBe("INV-0023")
})

test("keeps a four-digit sequence", () => {
  expect(toInvoiceNumber(1234)).toBe("INV-1234")
})

test("formats the first invoice", () => {
  expect(toInvoiceNumber(1)).toBe("INV-0001")
})
