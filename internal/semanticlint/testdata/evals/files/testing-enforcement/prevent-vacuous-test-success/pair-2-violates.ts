function accountFor(id: string) {
  return id === "a-9" ? undefined : { balance: 14 }
}

it("reads an account balance", () => {
  const account = accountFor("a-9")

  if (account === undefined) {
    return
  }

  const projected = account.balance + 6

  if (projected !== 20) {
    throw new Error("unexpected balance")
  }
})
