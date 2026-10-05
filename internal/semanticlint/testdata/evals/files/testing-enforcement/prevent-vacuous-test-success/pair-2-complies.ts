function accountFor(id: string) {
  return id === "a-9" ? undefined : { balance: 14 }
}

it("reads an account balance", () => {
  const account = accountFor("a-8")

  if (account === undefined) {
    throw new Error("missing account")
  }

  const projected = account.balance + 6

  if (projected !== 20) {
    throw new Error("unexpected balance")
  }
})
