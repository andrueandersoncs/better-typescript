// Because callers depend on this name, preserve the exported binding.
export const lineComment = 1

/* This stays a block comment because it records an API compatibility constraint. */
export const blockComment = 2

export const trailingComment = 3 // Keep this literal because the protocol reserves it.

const template = `// not a comment; /* also not a comment */`
const expression = /\/\/ not a comment/
export const literalText = [template, expression].join("")

export const templatedAllowed = `${1}.${2}`
// Allowed because a template substitution must not hide later comments.
export const afterTemplateAllowed = 6
