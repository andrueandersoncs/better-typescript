import { Schema } from "effect"

// 1. Empty object literal returned
export const empty = () => {
  return {}
}

// 2. Already-correct tagged schema construction (not a literal)
const Circle = Schema.TaggedStruct("Circle", {
  radius: Schema.Number
})
interface Circle extends Schema.Schema.Type<typeof Circle> {}
export const makeCircle = (radius: number): Circle => Circle.make({ radius })

// 4. Literal passed as a call argument (not returned)
export const send = (record: (value: { id: number }) => void) => {
  record({ id: 1 })
}

// 5. Non-object return
export const total = (a: number, b: number) => {
  return a + b
}

// 6. Locally constructed third-party adapter result
import type { AuthResult } from "@earendil-works/pi-ai"

export const toAuthResult = (apiKey: string): AuthResult => {
  const result = { auth: { apiKey }, source: "Codex OAuth" }

  return result
}
