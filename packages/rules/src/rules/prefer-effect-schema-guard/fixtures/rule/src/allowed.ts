import { Schema } from "effect"

// 1. `in` with a non-literal (identifier) key
export const hasDynamicKey = (value: object, key: string): boolean => {
  if (key in value) {
    return true
  }
  return false
}

// 2. `in` with a numeric key
export const hasIndex = (value: object): boolean => {
  if (0 in value) {
    return true
  }
  return false
}

// 3. `instanceof` (similar-looking, different operator)
export const isDate = (value: unknown): boolean => {
  if (value instanceof Date) {
    return true
  }
  return false
}

// 4. Property-truthiness check (no `in`)
export const isActive = (value: { active: boolean }): boolean => {
  if (value.active) {
    return value.active
  }
  return false
}

// 5. Already-correct `Schema.is` guard
const Person = Schema.Struct({ name: Schema.String })
export const isPerson = (value: unknown): boolean => {
  if (Schema.is(Person)(value)) {
    return true
  }
  return false
}
