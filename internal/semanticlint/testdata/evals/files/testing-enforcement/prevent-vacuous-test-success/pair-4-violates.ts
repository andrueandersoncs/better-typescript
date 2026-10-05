function lookupRate(rates: ReadonlyMap<string, number>, currency: string) {
  return rates.get(currency)
}

it("reads a conversion rate", () => {
  const rates = new Map<string, number>()
  const rate = lookupRate(rates, "EUR")

  if (rate !== undefined) {
    if (rate !== 1.08) {
      throw new Error("unexpected rate")
    }
  }

  const region = "west"
  if (region !== "west") {
    throw new Error("unexpected region")
  }
})
