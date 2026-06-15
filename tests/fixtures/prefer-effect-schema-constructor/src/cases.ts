export {}

// 1. Untagged block return
export const makePoint = (x: number, y: number) => {
  return { x, y }
}

// 2. Tagged block return
export const circle = (radius: number) => {
  return { _tag: "Circle", radius }
}

// 3. Concise arrow returning a parenthesized literal
export const makeUser = (id: number) => ({ id, active: true })

// 4. Ternary with two tagged branches (TWO matches)
export const toResult = (ok: boolean) => {
  return ok ? { _tag: "Ok" } : { _tag: "Err" }
}

// 5. Nullish-coalescing right-operand literal
export const withDefault = (input: { label: string } | null) => {
  return input ?? { label: "default" }
}
