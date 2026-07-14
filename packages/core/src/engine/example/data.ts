import { Array, Schema } from "effect"

export class ExampleSnippet extends Schema.Class<ExampleSnippet>(
  "ExampleSnippet"
)({
  filePath: Schema.String,
  code: Schema.String
}) {}

const exampleSnippetArray = Schema.NonEmptyArray(ExampleSnippet)

export class RefactorExample extends Schema.Class<RefactorExample>(
  "RefactorExample"
)({
  bad: exampleSnippetArray,
  good: exampleSnippetArray
}) {}

export type NonEmptyExampleTree = Array.NonEmptyReadonlyArray<ExampleSnippet>

export type NonEmptyRefactorExamples =
  Array.NonEmptyReadonlyArray<RefactorExample>

export class ExampleLoadError extends Schema.TaggedError<ExampleLoadError>(
  "ExampleLoadError"
)("ExampleLoadError", {
  message: Schema.String
}) {}
