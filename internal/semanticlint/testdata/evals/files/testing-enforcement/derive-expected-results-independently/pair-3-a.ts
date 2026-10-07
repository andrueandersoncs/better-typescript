import { describe, expect, it } from "vitest"
import { calculateCommission } from "../src/calculateCommission"

describe("calculateCommission", () => {
  it("uses the enterprise rate after the threshold", () => {
    const contract = {
      plan: "enterprise" as const,
      annualValue: 240_000
    }
    const expected = calculateCommission({
      plan: contract.plan,
      annualValue: contract.annualValue
    })

    expect(calculateCommission(contract)).toBe(expected)
  })
})
