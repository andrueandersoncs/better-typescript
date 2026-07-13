/**
 * Increments the input for callers that need the next sequence value.
 * @param x - Current sequence value
 * @returns The next sequence value
 */
export const documented = (x: number): number => x + 1

/**
 * Description-only JSDoc is not enough to exempt a multi-line comment.
 */
export const descriptionOnly = (x: number): number => x

/**
 * @param x - Tags without a description are not enough either.
 */
export const tagsOnly = (x: number): number => x

/**
 * Structured JSDoc on a non-exported binding is not an API contract.
 * @param x - Current sequence value
 */
const localDocumented = (x: number): number => x

export const usesLocal = localDocumented

/*
 * Multi-line block comment
 * spanning multiple lines
 */
export const multiLineBlock = 3

// Adjacent single-line comment first line
// adjacent single-line comment second line
export const afterAdjacent = 4

export const between = 5

// Three adjacent lines
// second line
// third line
export const afterThree = 6
