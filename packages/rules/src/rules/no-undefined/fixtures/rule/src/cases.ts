export {}

// Category: parameter accepting undefined (optional)
function pOpt(x?: number): number { // ~detect 15
  return x ?? 0
}

// Category: parameter accepting undefined (union)
function pUnion(x: number | undefined): number { // ~detect 17
  return x ?? 0
}

// Category: return type including undefined
function rType(): string | undefined { // ~detect 1
  return "a"
}

// Category: returning undefined from a function
function eReturn(): unknown {
  return undefined // ~detect 3
}

// Category: optional/undefined in type declaration (optional property)
interface DOptional {
  a?: number // ~detect 3
}

// Category: optional/undefined in type declaration (union property)
interface DUnion {
  b: string | undefined // ~detect 3
}

// Category: optional/undefined in type declaration (optional mapped type)
type MOptional<K extends string> = { [P in K]?: number } // ~detect 36

// Category: comparison against undefined (unknown satisfies strict type overlap)
declare const u: unknown
const cEq = u === undefined // ~detect 13
