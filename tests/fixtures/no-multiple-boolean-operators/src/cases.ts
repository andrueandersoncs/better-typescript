export {}

declare const a: boolean
declare const b: boolean
declare const c: boolean
declare const d: boolean
declare const e: boolean
declare const x: number
declare const y: number
declare const z: boolean

// Two &&
const r1 = a && b && c

// Mixed && / ||
const r2 = a || (b && c)

// === combined with &&
const r3 = x === y && z

// Double negation
const r4 = !!a

// Nested ternary
const r5 = a ? b : c ? d : e
