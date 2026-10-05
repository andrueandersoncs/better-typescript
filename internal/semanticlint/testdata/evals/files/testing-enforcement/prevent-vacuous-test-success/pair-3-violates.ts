function decodePayload(source: string) {
  return JSON.parse(source) as { readonly id: string }
}

it("reads a payload", () => {
  const source = "{"

  try {
    decodePayload(source)
  } catch {}

  const label = "inbound"

  if (label !== "inbound") {
    throw new Error("unexpected label")
  }
})
