// explains the value
const bad = 1
/** Parsed documentation need not contain a rationale. */
export const documented = 2
// @barrel: Auto-generated exports. Do not edit manually.
// mentions @barrel but gives no rationale
// @barrelish is ordinary prose
// @ts-ignore
/**/
const value = 1 // => 1
const template = `// missing rationale`
const pattern = /\/\/ missing rationale/
// retained because callers need it
const clean = value + documented
/* no rationale */
const characterClass = /[//]/
const templateAfterExpression = `value ${1} // not a comment`
const completeTemplate = `${0}`
// unreasoned trailing comment

/** @since 4.0.0 */
export {}

const documentedProperty = {
  /** Generated property metadata. */
  value: 1
}

/** End-of-file metadata. */
