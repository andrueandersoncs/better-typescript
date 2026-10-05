function validateToken(token: string) {
  return token === "expired"
    ? Promise.reject(new Error("expired token"))
    : Promise.resolve({ subject: token })
}

it("rejects an expired token", async () => {
  let failure: unknown

  try {
    await validateToken("expired")
  } catch (error) {
    failure = error
  }

  if (!(failure instanceof Error)) {
    throw new Error("missing token error")
  }
})
