export {}

// 1. Untagged block return
export const makePoint = (x: number, y: number) => {
  return { x, y } // ~detect 10
}

// 2. Tagged block return
export const circle = (radius: number) => {
  return { _tag: "Circle", radius } // ~detect 10
}

// 3. Concise arrow returning a parenthesized literal
export const makeUser = (id: number) => ({ id, active: true }) // ~detect 42

// 4. Ternary with two tagged branches (TWO matches)
export const toResult = (ok: boolean) => {
  return ok ? { _tag: "Ok" } : { _tag: "Err" } // ~detect 15,32
}

// 5. Nullish-coalescing right-operand literal
export const withDefault = (input: { label: string } | null) => {
  return input ?? { label: "default" } // ~detect 19
}

// 6. Object bound locally then returned unchanged
export const makeConfig = () => {
  const config = { retries: 3 } // ~detect 18
  return config
}

// 7. Object binding returned through a transparent wrapper in nested control flow
export const makeNestedConfig = (enabled: boolean) => {
  const config = { enabled } // ~detect 18

  if (enabled) {
    return (config as typeof config)
  }

  return config
}

// 8. Conditional object binding returned unchanged
export const makeConditionalConfig = (enabled: boolean) => {
  const config = enabled ? { mode: "on" } : { mode: "off" } // ~detect 28,45

  return config
}

interface ProjectUser {
  readonly id: number
}

// 9. Standard-library containers do not turn first-party return contracts foreign
export const makeAsyncUser = async (id: number): Promise<ProjectUser> => {
  return { id } // ~detect 10
}
