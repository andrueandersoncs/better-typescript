export {}

declare const x: number
declare const y: number
declare const p: boolean
declare const q: boolean
declare const r: boolean
declare const a: boolean
declare const b: boolean
declare const c: boolean

// Ternary with a single comparison in its condition
const t1 = x === y ? a : b

// Ternary whose condition holds a single operator
const t2 = p && q ? a : b

// Condition with two && operators is flagged at the condition
const t3 = p && q && r ? a : b

// Nested ternary in a branch still counts two operators
const t4 = p ? a : q ? b : c
