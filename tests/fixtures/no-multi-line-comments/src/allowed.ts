// A lone single-line comment is fine
export const withComment = 2

export const add = (a: number, b: number): number => a + b

export const x = 3
// Isolated comment after a gap
export const y = 4

// Another isolated comment
export const z = 5

export const first = 6 // trailing note on the first line
export const second = 7 // trailing note on the second line

export const templatedAllowed = `${1}.${2}`
// Isolated comment after a template substitution
export const afterTemplateAllowed = 6
