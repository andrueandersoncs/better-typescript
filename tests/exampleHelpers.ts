import {
  ExampleSnippet,
  InlineRefactorExamples,
  RefactorExample,
  type RefactorExampleSource
} from "@better-typescript/core/engine/example/data"

export const makeExampleSnippet = (filePath: string, code: string) =>
  ExampleSnippet.make({ filePath, code })

export const makeRefactorExample = (bad: ExampleSnippet, good: ExampleSnippet) =>
  RefactorExample.make({ bad: [bad], good: [good] })

export const makeInlineRefactorExamples = (
  examples: ReadonlyArray<RefactorExample>
): RefactorExampleSource => InlineRefactorExamples.make({ examples })
