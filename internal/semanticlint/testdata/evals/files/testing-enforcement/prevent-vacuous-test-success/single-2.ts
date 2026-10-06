function displayName(person: { readonly first: string; readonly last: string }) {
  return `${person.first} ${person.last}`
}

it("joins a display name", () => {
  const person = {
    first: "Nia",
    last: "Vega"
  }
  const name = displayName(person)

  if (name !== "Nia Vega") {
    throw new Error("unexpected name")
  }
})
