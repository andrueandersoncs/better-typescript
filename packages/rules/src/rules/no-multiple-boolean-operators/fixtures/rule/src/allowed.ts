export {}

declare const a: number
declare const b: number
declare const c: number
declare const d: number
declare const x: number
declare const y: number
declare const z: number

// Single operator
const s1 = a && b

// Single ternary
const s2 = a ? b : c

// Single negation
const s3 = !a

// Non-counted operators (<)
const s4 = a < b && c < d

// Non-counted == operator
const s5 = x == y && z
