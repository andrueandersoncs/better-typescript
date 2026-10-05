function decodePayload(source: string) {
  return JSON.parse(source) as { readonly id: string }
}

it("reads a payload", () => {
  const source = "{"
  let failure: unknown

  try {
    decodePayload(source)
  } catch (error) {
    failure = error
  }

  if (!(failure instanceof SyntaxError)) {
    throw new Error("missing parse error")
  }
})
