/** This JSDoc documents the exported API. */
export const documented = 1

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
