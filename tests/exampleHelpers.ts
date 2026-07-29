import { ExampleSnippet, RefactorExample } from "@better-typescript/core/engine/example/data"

export const makeRefactorExample = (bad: ExampleSnippet, good: ExampleSnippet) => {
  return RefactorExample.make({ bad: [bad], good: [good] })
}
