export {}

// 1. === with tag on the left
export const isCircle = (shape: { _tag: string }): boolean => {
  return shape._tag === "Circle"
}

// 2. !== (negated) => !-prefixed suggestion
export const notSquare = (shape: { _tag: string }): boolean => {
  return shape._tag !== "Square"
}

// 3. Tag on the RIGHT, literal on the left
export const isTriangle = (shape: { _tag: string }): boolean => {
  return "Triangle" === shape._tag
}

// 4. Nested value expression before ._tag
export const isOk = (result: { value: { _tag: string } }): boolean => {
  return result.value._tag === "Ok"
}

// 5. Two comparisons joined by || (TWO matches)
export const isRound = (shape: { _tag: string }): boolean => {
  return shape._tag === "Circle" || shape._tag === "Ellipse"
}

// 6. No-substitution template literal tag (rendered double-quoted)
export const isPending = (task: { _tag: string }): boolean => {
  return task._tag === `Pending`
}
