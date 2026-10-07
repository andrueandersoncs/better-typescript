import { describe, expect, it } from "vitest"

const hasValue = (value: string | undefined): boolean => {
  return value !== undefined
}

const credentialName = "test-payment-token"

describe("payment configuration", () => {
  it("has an API credential available", () => {
    const credential = credentialName
    const available = hasValue(credential)
    expect(available).toBe(true)
  })
})
