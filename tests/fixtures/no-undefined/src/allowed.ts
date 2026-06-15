export {}

// Allowed: required, non-undefined parameter
function apRequired(x: number): number {
  return x
}

// Allowed: null union (not undefined)
function apNull(x: number | null): number {
  return x ?? 0
}

// Allowed: return type with null (not undefined)
function arNull(): string | null {
  return null
}

// Allowed: non-undefined return
function areNormal(): number {
  return 1
}

// Allowed: bare return in void function
function areVoid(): void {
  return
}

// Allowed: arrow with non-undefined body
const arrowNull = (): null => null

// Allowed: required property (no undefined)
interface ADRequired {
  a: number
}

// Allowed: -? mapped modifier
type AMinus<K extends string> = { [P in K]-?: number }

// Allowed: === null comparison
declare const u: unknown
const anNull = u === null

// Allowed: typeof x === "undefined" comparison (string literal, not the undefined identifier)
const anTypeof = typeof u === "undefined"
