export {}

// 1. Simple string-key `in` guard
export const hasRole = (value: object): boolean => {
  if ("role" in value) {
    return true
  }
  return false
}

// 2. Two `in` checks in one `&&` condition (TWO matches)
export const hasBoth = (value: object): boolean => {
  if ("id" in value && "name" in value) {
    return true
  }
  return false
}

// 3. No-substitution template literal key
export const hasTag = (value: object): boolean => {
  if (`tag` in value) {
    return true
  }
  return false
}

// 4. Parenthesized key
export const hasKind = (value: object): boolean => {
  if (("kind") in value) {
    return true
  }
  return false
}

// 5. `in` check nested inside a call in the condition
export const guarded = (value: object): boolean => {
  if (Boolean("status" in value)) {
    return true
  }
  return false
}
