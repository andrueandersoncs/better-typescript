// Benchmark fixture: dense rule violations.
// Every rule should report at least one match in this file, so each rule's full
// match-construction path is exercised — not just its traversal/filter path.
// This file must stay valid TypeScript under strict mode; violations are lint-level only.

// prefer-effect-fn requires the `Effect` symbol to be declared in a file named
// Effect.ts (or Effect.d.ts), so the phantom lives in the sibling ./Effect.ts module.
import type { Effect } from "./Effect.js"
import { succeed } from "./Effect.js"

// prefer-effect-fn: variable-declared function with parameters returning an Effect.
export const fetchUser = (id: string): Effect<string, never, never> => succeed(id)

export const combineUsers = (left: string, right: string): Effect<string, never, never> =>
  succeed(`${left}:${right}`)

// no-function-keyword, no-nested-if-statements, no-throw, no-new-error.
export function legacyParse(raw: string): number {
  if (raw.length > 0) {
    if (raw.startsWith("-")) {
      throw new Error("negative values are not supported")
    }
    return Number.parseInt(raw, 10)
  }
  return 0
}

// prefer-conditional-return: if/return followed by return.
export function pickLabel(flag: boolean): string {
  if (flag) {
    return "yes"
  }
  return "no"
}

// prefer-direct-boolean-return: returns literal true/false from both branches.
export const isLong = (value: string): boolean => {
  if (value.length > 10) {
    return true
  }
  return false
}

// prefer-implicit-return: block-bodied arrow with a single return statement.
export const double = (value: number): number => {
  return value * 2
}

// no-undefined: in the return type and as a returned expression.
export const findIndexOf = (
  haystack: ReadonlyArray<string>,
  needle: string
): number | undefined => {
  const index = haystack.indexOf(needle)
  if (index >= 0) {
    return index
  }
  return undefined
}

// no-multiple-boolean-operators, no-inline-boolean-expressions.
export const isValidUser = (name: string, age: number, active: boolean): boolean =>
  (name.length > 0 && age >= 18 && active) || name === "admin"

export const hasAccess = (role: string, owner: boolean, locked: boolean): boolean =>
  (role === "admin" || owner) && !locked

// no-mutable-variable-declarations, no-for-of-loops, no-mutable-array-methods.
export function collectLengths(words: ReadonlyArray<string>): Array<number> {
  let lengths: Array<number> = []
  for (const word of words) {
    lengths.push(word.length)
  }
  lengths.sort((first, second) => first - second)
  return lengths
}

export function sumPositive(values: ReadonlyArray<number>): number {
  let total = 0
  for (const value of values) {
    if (value > 0) {
      total += value
    }
  }
  return total
}

// no-switch-statements.
export function describeCode(code: number): string {
  switch (code) {
    case 200:
      return "ok"
    case 404:
      return "missing"
    default:
      return "unknown"
  }
}

// no-callbacks: declaration accepting a void-returning function argument.
export function forEachChar(value: string, callback: (char: string) => void): void {
  for (const char of value) {
    callback(char)
  }
}

export interface Emitter {
  on(event: string, listener: (payload: string) => void): void
}

// no-duplicate-if-bodies: two if statements with identical bodies.
export function classify(value: number): string {
  if (value > 100) {
    return "big"
  }
  if (value > 50) {
    return "big"
  }
  return "small"
}

// prefer-effect-schema-guard: string-key in-operator check inside an if condition.
export function readName(value: object): string {
  if ("name" in value && typeof (value as { name: unknown }).name === "string") {
    return String((value as { name: unknown }).name)
  }
  return ""
}

// no-inline-closures: arrow function in argument position instead of naming or currying.
export const shoutedWords = (words: ReadonlyArray<string>): ReadonlyArray<string> =>
  words.map((word) => word.toUpperCase())

// no-duplicate-function-names: `formatValue` is also declared in typeHeavy.ts.
export const formatValue = (value: number): string => value.toFixed(2)
