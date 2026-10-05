function lookupRate(rates: ReadonlyMap<string, number>, currency: string) {
  return rates.get(currency)
}

it("reads a conversion rate", () => {
  const rates = new Map<string, number>([["EUR", 1.08]])
  const rate = lookupRate(rates, "EUR")

  if (rate !== 1.08) {
    throw new Error("unexpected rate")
  }

  const region = "west"
  if (region !== "west") {
    throw new Error("unexpected region")
  }
})
