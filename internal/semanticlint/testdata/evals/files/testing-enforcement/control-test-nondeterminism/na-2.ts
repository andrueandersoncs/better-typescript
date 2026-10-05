function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("")
}

it("creates a display code", () => {
  const name = "Mira Chen"
  const code = initials(name)
  const pieces = name.split(" ")

  if (pieces.length !== 2) {
    throw new Error("unexpected pieces")
  }

  if (code !== "MC") {
    throw new Error("unexpected code")
  }
})
