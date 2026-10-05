function total(values: ReadonlyArray<number>) {
  return values.reduce((sum, value) => sum + value, 0)
}

it("totals invoice lines", () => {
  const amounts = [12, 8, 5]
  const amount = total(amounts)
  const count = amounts.length

  if (count !== 3) {
    throw new Error("unexpected count")
  }

  if (amount !== 25) {
    throw new Error("unexpected amount")
  }
})
