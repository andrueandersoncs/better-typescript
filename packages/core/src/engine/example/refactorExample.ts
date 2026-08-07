import { Schema } from "effect"
import { ExampleSnippet } from "./exampleSnippet.js"

const exampleSnippetArray = Schema.NonEmptyArray(ExampleSnippet)

// RefactorExample is the shared bad/good pair because loaders need one vocabulary.
export const RefactorExample = Schema.Struct({
  bad: exampleSnippetArray,
  good: exampleSnippetArray
})

export interface RefactorExample extends Schema.Schema.Type<typeof RefactorExample> {}
