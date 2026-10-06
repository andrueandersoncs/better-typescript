function parcelWeight(items: ReadonlyArray<{ readonly grams: number }>) {
  return items.reduce((total, item) => total + item.grams, 0)
}

it("adds parcel weights", () => {
  const items = [
    { grams: 120 },
    { grams: 80 },
    { grams: 25 }
  ]
  const weight = parcelWeight(items)

  if (weight !== 225) {
    throw new Error("unexpected weight")
  }
})
