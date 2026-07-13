/**
 * Stable documented export for API consumers.
 * @remarks Preserves the exported binding name used by callers.
 */
export const documented = 1

/**
 * Description-only JSDoc is not an API contract exemption.
 */
export const descriptionOnly = 10

/**
 * @remarks Tags without a description are not enough either.
 */
export const tagsOnly = 11

/**
 * Structured JSDoc on a non-exported binding is not an API contract.
 * @remarks Local-only documentation is not an exported API contract.
 */
const localDocumented = 12

export const usesLocal = localDocumented

// This describes the binding.
export const lineComment = 2

/* This describes the next value. */
export const blockComment = 3

export const trailingComment = 4 // This describes the literal.

export const almostBecause = 5 // becauseish is not a whole word.

const template = `// not a comment; /* also not a comment */`
const expression = /\/\/ not a comment/
export const literalText = [template, expression].join("")

export const afterLiteralText = 6 // This must still be found.

export const emptyBlock = () => {
  /* This is inside an empty block. */
}

export const unicodeAlmostBecause = 7 // becauseé is not a whole word.
/**/
export const emptyBlockComment = 8

export const eofComment = 9
// This end comment lacks the required explanation.
