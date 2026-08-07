import { ExampleSnippet } from "@better-typescript/core/engine/example/exampleSnippet"
import { RefactorExample } from "@better-typescript/core/engine/example/refactorExample"

export const makeRefactorExample = (bad: ExampleSnippet, good: ExampleSnippet) => {
  return RefactorExample.make({ bad: [bad], good: [good] })
}
