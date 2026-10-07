import { expect, test } from "vitest"

const normalizeEmail = (email: string) => email.trim().toLowerCase()

test("normalizes a mixed-case email", () => {
  expect(normalizeEmail("  Ari@Example.com ")).toBe("ari@example.com")
})

test("keeps a normalized email unchanged", () => {
  expect(normalizeEmail("sam@example.com")).toBe("sam@example.com")
})

test("removes surrounding whitespace", () => {
  expect(normalizeEmail(" lee@example.com ")).toBe("lee@example.com")
})
