it("stores a profile", () => {
  const name = `profile-${crypto.randomUUID()}`
  const profiles = new Map<string, { readonly group: string }>()
  const record = { group: "staff" }
  profiles.set(name, record)
  const stored = profiles.get(name)

  if (stored?.group !== record.group) {
    throw new Error("unexpected group")
  }

  if (profiles.has(name) !== name.endsWith("a")) {
    throw new Error("unexpected profile")
  }

  if (profiles.size !== 1) {
    throw new Error("unexpected size")
  }
})
