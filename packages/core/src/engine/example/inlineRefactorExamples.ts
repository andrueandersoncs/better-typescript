import { Schema } from "effect"
import { RefactorExample } from "./refactorExample.js"

const refactorExampleArray = Schema.Array(RefactorExample)

// InlineRefactorExamples keeps already-built snippets because construction must stay inert.
export const InlineRefactorExamples = Schema.TaggedStruct("inline", {
  examples: refactorExampleArray
})

export interface InlineRefactorExamples extends Schema.Schema.Type<typeof InlineRefactorExamples> {}
