import { Schema } from "effect"

// 1. Loose equality (==), not strict
export const looseCheck = (shape: { _tag: string }): boolean => {
  return shape._tag == "Circle"
}

// 2. Comparing a non-_tag property
export const byKind = (shape: { kind: string }): boolean => {
  return shape.kind === "Circle"
}

// 3. _tag compared to another _tag access (non-literal)
export const sameTag = (a: { _tag: string }, b: { _tag: string }): boolean => {
  return a._tag === b._tag
}

// 4. _tag compared to a numeric literal
export const tagIsZero = (shape: { _tag: number }): boolean => {
  return shape._tag === 0
}

// 5. Already-correct Schema.is usage
const Shape = Schema.Struct({ _tag: Schema.String })
export const isShape = (value: unknown): boolean => Schema.is(Shape)(value)
