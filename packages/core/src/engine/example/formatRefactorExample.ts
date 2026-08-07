import { Array, Function } from "effect"
import type { ExampleSnippet } from "./exampleSnippet.js"
import type { RefactorExample } from "./refactorExample.js"

const formatExampleFiles =
  (label: string) =>
  (files: ReadonlyArray<ExampleSnippet>): string => {
    const sections = Array.map(files, (snippet) => {
      const codeLines = snippet.code.split("\n")
      const indentedLines = Array.map(codeLines, (line) => `    ${line}`)
      const indentedCode = Array.join(indentedLines, "\n")

      return `  ${label} (${snippet.filePath}):\n${indentedCode}`
    })

    return Array.join(sections, "\n")
  }

const formatRefactorExampleUncached = (example: RefactorExample) => {
  const badText = formatExampleFiles("Bad")(example.bad)
  const goodText = formatExampleFiles("Good")(example.good)
  const joinedParts = Array.make(badText, goodText)
  return Array.join(joinedParts, "\n")
}

export const formatRefactorExample = Function.memoize(formatRefactorExampleUncached)
