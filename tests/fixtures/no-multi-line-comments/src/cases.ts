/**
 * Increments the input for callers that need the next sequence value.
 * @param x - Current sequence value
 * @returns The next sequence value
 */
export const documented = (x: number): number => x + 1

/**
 * Description-only JSDoc is also a multi-line comment.
 */
export const descriptionOnly = (x: number): number => x

/**
 * @param x - Tags without a description are flagged too.
 */
export const tagsOnly = (x: number): number => x

/**
 * Structured JSDoc on a non-exported binding is flagged.
 * @param x - Current sequence value
 */
const localDocumented = (x: number): number => x

export const usesLocal = localDocumented

/*
 * Multi-line block comment
 * spanning multiple lines
 */
export const multiLineBlock = 3

/* A single-line block comment is still the block form */
export const singleLineBlock = 7

// Adjacent single-line comment first line
// adjacent single-line comment second line
export const afterAdjacent = 4

export const between = 5

// Three adjacent lines
// second line
// third line
export const afterThree = 6

// Stacked comment first line

// stacked second line separated only by a blank line
export const afterStacked = 8

export const templated = `${1}.${2}`
// stacked after template first line
// stacked after template second line
export const afterTemplate = 10
