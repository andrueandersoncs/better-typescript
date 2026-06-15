export {}

// Category: parameter accepting undefined (optional)
function pOpt(x?: number): number {
  return x ?? 0
}

// Category: parameter accepting undefined (union)
function pUnion(x: number | undefined): number {
  return x ?? 0
}

// Category: return type including undefined
function rType(): string | undefined {
  return "a"
}

// Category: returning undefined from a function
function eReturn(): unknown {
  return undefined
}

// Category: optional/undefined in type declaration (optional property)
interface DOptional {
  a?: number
}

// Category: optional/undefined in type declaration (union property)
interface DUnion {
  b: string | undefined
}

// Category: optional/undefined in type declaration (optional mapped type)
type MOptional<K extends string> = { [P in K]?: number }

// Category: comparison against undefined (unknown satisfies strict type overlap)
declare const u: unknown
const cEq = u === undefined
