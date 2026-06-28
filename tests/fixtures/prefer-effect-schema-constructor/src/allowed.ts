import { Schema } from "effect"

// 1. Empty object literal returned
export const empty = () => {
  return {}
}

// 2. Already-correct Schema construction (NewExpression, not a literal)
class Circle extends Schema.TaggedClass<Circle>()("Circle", {
  radius: Schema.Number
}) {}
export const makeCircle = (radius: number): Circle => new Circle({ radius })

// 3. Literal assigned to a variable, then the variable returned
export const buildConfig = () => {
  const config = { retries: 3 }
  return config
}

// 4. Literal passed as a call argument (not returned)
export const send = (record: (value: { id: number }) => void) => {
  record({ id: 1 })
}

// 5. Non-object return
export const total = (a: number, b: number) => {
  return a + b
}
