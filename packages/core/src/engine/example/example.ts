import * as fs from "node:fs"
import * as path from "node:path"
import { Array, Effect, Order, pipe } from "effect"
import {
  ExampleLoadError,
  ExampleSnippet,
  type NonEmptyExampleTree,
  type NonEmptyRefactorExamples,
  RefactorExample
} from "./data.js"

export const exampleSnippet = (filePath: string, code: string): ExampleSnippet =>
  new ExampleSnippet({ filePath, code })

export const refactorExample = (bad: ExampleSnippet, good: ExampleSnippet): RefactorExample => {
  const badExamples = Array.of(bad)
  const goodExamples = Array.of(good)

  return new RefactorExample({
    bad: badExamples,
    good: goodExamples
  })
}

export const refactorExampleTrees = (
  bad: NonEmptyExampleTree,
  good: NonEmptyExampleTree
): RefactorExample => new RefactorExample({ bad, good })

const formatExampleTree =
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

export const formatRefactorExample = (example: RefactorExample): string => {
  const badText = formatExampleTree("Bad")(example.bad)
  const goodText = formatExampleTree("Good")(example.good)

  const joinedParts = Array.make(badText, goodText)
  return Array.join(joinedParts, "\n")
}

const byPath = Order.string
const byPairName = Order.string

const readDirectoryEntries = (
  directory: string
): Effect.Effect<ReadonlyArray<fs.Dirent>, ExampleLoadError> =>
  Effect.try({
    try: () => fs.readdirSync(directory, { withFileTypes: true }),
    catch: () =>
      new ExampleLoadError({
        message: `Unable to read example directory: ${directory}`
      })
  })

const directoryExists = (absolutePath: string): boolean => {
  const exists = fs.existsSync(absolutePath)

  return exists && fs.statSync(absolutePath).isDirectory()
}

const collectTypeScriptFiles: (
  directory: string
) => Effect.Effect<ReadonlyArray<string>, ExampleLoadError> = Effect.fn("collectTypeScriptFiles")(
  function* (directory: string) {
    const entries = yield* readDirectoryEntries(directory)

    const nested = yield* Effect.forEach(entries, (entry) => {
      const absolute = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return collectTypeScriptFiles(absolute)
      }

      const typescript = entry.name.endsWith(".ts")
      const declaration = entry.name.endsWith(".d.ts")
      const notDeclaration = !declaration
      const isSource = typescript && notDeclaration
      const keep = entry.isFile() && isSource

      const paths = keep ? Array.of(absolute) : Array.empty()

      return Effect.succeed(paths)
    })

    const flattened = Array.flatten(nested)

    return Array.sort(flattened, byPath)
  }
)

const readExampleTree: (treeRoot: string) => Effect.Effect<NonEmptyExampleTree, ExampleLoadError> =
  Effect.fn("readExampleTree")(function* (treeRoot: string) {
    const absoluteFiles = yield* collectTypeScriptFiles(treeRoot)

    const snippets = yield* Effect.forEach(absoluteFiles, (absoluteFile) =>
      Effect.gen(function* () {
        const code = yield* Effect.try({
          try: () => {
            const text = fs.readFileSync(absoluteFile, "utf8")

            return text.endsWith("\n") ? text.slice(0, -1) : text
          },
          catch: () =>
            new ExampleLoadError({
              message: `Unable to read example file: ${absoluteFile}`
            })
        })

        const relative = path.relative(treeRoot, absoluteFile)
        const segments = relative.split(path.sep)
        const filePath = Array.join(segments, "/")

        return exampleSnippet(filePath, code)
      })
    )

    return yield* pipe(
      snippets,
      Array.matchLeft({
        onEmpty: () =>
          pipe(
            new ExampleLoadError({
              message: `Example tree has no TypeScript files: ${treeRoot}`
            }),
            Effect.fail
          ),
        onNonEmpty: (first, rest) => pipe(Array.prepend(rest, first), Effect.succeed)
      })
    )
  })

export const loadRefactorExamplesAt: (
  exampleRoot: string
) => Effect.Effect<NonEmptyRefactorExamples, ExampleLoadError> = Effect.fn(
  "loadRefactorExamplesAt"
)(function* (exampleRoot: string) {
  if (!directoryExists(exampleRoot)) {
    return yield* new ExampleLoadError({
      message: `Missing example directory: ${exampleRoot}`
    })
  }

  const entries = yield* readDirectoryEntries(exampleRoot)

  const names = Array.flatMap(entries, (entry) => {
    if (!entry.isDirectory()) {
      return Array.empty()
    }

    const pairRoot = path.join(exampleRoot, entry.name)
    const badRoot = path.join(pairRoot, "bad")
    const goodRoot = path.join(pairRoot, "good")
    const hasBad = directoryExists(badRoot)
    const hasGood = directoryExists(goodRoot)
    const complete = hasBad && hasGood

    return complete ? Array.of(entry.name) : Array.empty()
  })

  const pairNames = Array.sort(names, byPairName)

  const examples = yield* Effect.forEach(pairNames, (pairName) =>
    Effect.gen(function* () {
      const pairRoot = path.join(exampleRoot, pairName)
      const badRoot = path.join(pairRoot, "bad")
      const goodRoot = path.join(pairRoot, "good")
      const bad = yield* readExampleTree(badRoot)
      const good = yield* readExampleTree(goodRoot)

      return new RefactorExample({ bad, good })
    })
  )

  return yield* pipe(
    examples,
    Array.matchLeft({
      onEmpty: () =>
        pipe(
          new ExampleLoadError({
            message: `Expected example/<id>/{bad,good} directories under ${exampleRoot}`
          }),
          Effect.fail
        ),
      onNonEmpty: (first, rest) => pipe(Array.prepend(rest, first), Effect.succeed)
    })
  )
})
