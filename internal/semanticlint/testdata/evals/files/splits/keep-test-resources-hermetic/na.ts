import { describe, expect, it } from "vitest"

const serviceLabel = (name: string): string => {
  return `Service: ${name}`
}

const labelLength = (label: string): number => {
  return label.length
}

describe("service labels", () => {
  it("builds a readable service label", () => {
    const label = serviceLabel("billing")
    const length = labelLength(label)
    expect(length).toBeGreaterThan(0)
  })
})
