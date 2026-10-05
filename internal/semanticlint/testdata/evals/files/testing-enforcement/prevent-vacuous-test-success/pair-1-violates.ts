function invoiceTotal(lines: ReadonlyArray<{ readonly amount: number }>) {
  let total = 0

  for (const line of lines) {
    total += line.amount
  }

  return total
}

it("totals invoice lines", () => {
  const lines: ReadonlyArray<{ readonly amount: number }> = []

  for (const line of lines) {
    if (invoiceTotal([line]) !== line.amount) {
      throw new Error("unexpected amount")
    }
  }
})
