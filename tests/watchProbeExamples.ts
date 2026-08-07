import { ExampleSnippet } from "@better-typescript/core/engine/example/exampleSnippet"
import { InlineRefactorExamples } from "@better-typescript/core/engine/example/inlineRefactorExamples"
import { makeRefactorExample } from "./exampleHelpers.js"

export const probeExamples = InlineRefactorExamples.make({
  examples: [
    makeRefactorExample(
      ExampleSnippet.make({ filePath: "src/cases.ts", code: `throw new Error("boom")` }),
      ExampleSnippet.make({ filePath: "src/cases.ts", code: "yield* new BoomError()" })
    )
  ]
})
