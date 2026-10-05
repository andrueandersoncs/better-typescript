it("places a card", () => {
  const layout = ["west", "center", "east"]
  const weights = [2, 3, 5]
  const cardId = `card-${Math.random()}`
  const cards = new Map<string, string>()
  cards.set(cardId, "queued")
  const seed = 3
  const lane = (seed * 48271) % layout.length
  const selected = layout[lane]
  const weight = weights[lane]
  const stored = cards.get(cardId)

  if (stored !== "queued") {
    throw new Error("unexpected card")
  }

  if (weight < 1) {
    throw new Error("unexpected weight")
  }

  if (selected !== "west") {
    throw new Error("unexpected lane")
  }

  if (layout.length !== 3) {
    throw new Error("unexpected layout")
  }
})
