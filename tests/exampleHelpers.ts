import { ExampleSnippet, RefactorExample } from "@better-typescript/core/engine/example/data"

export const makeRefactorExample = (bad: ExampleSnippet, good: ExampleSnippet) => {
  const badExamples = [bad]
  const goodExamples = [good]

  return RefactorExample.make({ bad: badExamples, good: goodExamples })
}
