import { Array } from "effect"

export const mutableArrayMethodNames = Array.make<
  ["copyWithin", "fill", "pop", "push", "reverse", "shift", "sort", "splice", "unshift"]
>("copyWithin", "fill", "pop", "push", "reverse", "shift", "sort", "splice", "unshift")
