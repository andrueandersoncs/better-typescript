import { Array, Schema } from "effect"

// ExampleSnippet is the shared filePath/code pair because owners need one vocabulary.
export class ExampleSnippet extends Schema.Class<ExampleSnippet>("ExampleSnippet")({
  filePath: Schema.String,
  code: Schema.String
}) {}

const exampleSnippetArray = Schema.NonEmptyArray(ExampleSnippet)

// RefactorExample is the shared bad/good pair because loaders need one vocabulary.
export class RefactorExample extends Schema.Class<RefactorExample>("RefactorExample")({
  bad: exampleSnippetArray,
  good: exampleSnippetArray
}) {}

// NonEmptyExampleTree is a non-empty snippet tree because readers need one vocabulary.
export type NonEmptyExampleTree = Array.NonEmptyReadonlyArray<ExampleSnippet>

// NonEmptyRefactorExamples is a non-empty example list because loaders need one vocabulary.
export type NonEmptyRefactorExamples = Array.NonEmptyReadonlyArray<RefactorExample>

// ExampleLoadError is the shared load-failure contract because loaders need one vocabulary.
export class ExampleLoadError extends Schema.TaggedErrorClass<ExampleLoadError>()(
  "ExampleLoadError",
  {
    message: Schema.String
  }
) {}
