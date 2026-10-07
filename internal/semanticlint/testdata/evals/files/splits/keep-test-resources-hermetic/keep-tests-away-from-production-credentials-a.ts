import { describe, expect, it } from "vitest"

const hasValue = (value: string | undefined): boolean => {
  return value !== undefined
}

const credentialName = "PAYMENTS_API_KEY"

describe("payment configuration", () => {
  it("has an API credential available", () => {
    const credential = process.env[credentialName]
    const available = hasValue(credential)
    expect(available).toBe(true)
  })
})
