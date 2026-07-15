// Benchmark fixture: dense rule disallowed cases.
// Every rule should report at least one match in this file, so each rule's full
// match-construction path is exercised — not just its traversal/filter path.
// This file must stay valid TypeScript under strict mode; disallowed cases are lint-level only.

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

// no-explicit-any-return: explicit any in a function return type.
export const parseUnsafeJson = (raw: string): any => JSON.parse(raw)

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
  on(event: string, handler: (payload: string) => void): void
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

// prefer-effect-schema-is: direct _tag comparison instead of Schema.is.
interface ActiveSession {
  readonly _tag: "ActiveSession"
  readonly id: string
}

export const isActiveSession = (session: ActiveSession): boolean => session._tag === "ActiveSession"

// prefer-effect-property-accessors: property-access-only functions should use
// Struct.get for structs or Record.get / Record.has for records.
export const sessionId = (session: ActiveSession): string => session.id

export const acceptHeader = (headers: Record<string, string>): string => headers.accept

// prefer-effect-schema-constructor: raw object literals in return position instead of
// values constructed through a schema. prefer-effect-schema-class: FlatMapStep is an
// interface whose values this file constructs, so it should be a Schema class.
interface FlatMapStep {
  readonly _tag: "FlatMap"
  readonly first: string
  readonly f: (input: string) => string
}

const echoInput = (input: string): string => input

export const flatMapStep = (node: string): FlatMapStep => {
  const first = node.trim()

  return {
    _tag: "FlatMap",
    first,
    f: echoInput
  }
}

export const orderSummary = (
  id: string,
  amountCents: number
): { readonly id: string; readonly amountCents: number } => ({
  id,
  amountCents
})

// no-inline-closures: arrow function in argument position instead of naming or currying.
export const shoutedWords = (words: ReadonlyArray<string>): ReadonlyArray<string> =>
  words.map((word) => word.toUpperCase())

// no-nested-calls: a value-producing call computed inline in another call's arguments.
const halfOf = (value: number): number => value / 2

export const roundedHalf = (value: number): number => Math.round(halfOf(value))

// no-duplicate-function-names: `formatValue` is also declared in typeHeavy.ts.
export const formatValue = (value: number): string => value.toFixed(2)
