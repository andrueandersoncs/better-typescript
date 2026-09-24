export type Check = {
  readonly passed: boolean
  readonly reason?: string
}

export const verifyOutcome = (expected: number, actual: number): Check =>
  expected === actual
    ? { passed: true }
    : { passed: false, reason: "mismatch" }
