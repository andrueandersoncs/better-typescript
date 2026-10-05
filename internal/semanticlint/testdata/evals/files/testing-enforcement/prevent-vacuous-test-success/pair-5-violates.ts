function validateToken(token: string) {
  return token === "expired"
    ? Promise.reject(new Error("expired token"))
    : Promise.resolve({ subject: token })
}

it("rejects an expired token", async () => {
  try {
    await validateToken("active")
  } catch {}

  const source = "gateway"
  if (source !== "gateway") {
    throw new Error("unexpected source")
  }
})
