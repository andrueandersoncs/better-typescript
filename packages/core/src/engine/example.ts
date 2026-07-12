import * as fs from "node:fs"
import * as path from "node:path"
import { Array, Effect, Order, Schema, pipe } from "effect"

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

export type NonEmptyExampleTree = readonly [
  ExampleSnippet,
  ...Array<ExampleSnippet>
]

export type NonEmptyRefactorExamples = readonly [
  RefactorExample,
  ...Array<RefactorExample>
]

export class ExampleLoadError extends Schema.TaggedError<ExampleLoadError>(
  "ExampleLoadError"
)("ExampleLoadError", {
  message: Schema.String
}) {}


export const exampleSnippet = (
  filePath: string,
  code: string
): ExampleSnippet => new ExampleSnippet({ filePath, code })

export const refactorExample = (
  bad: ExampleSnippet,
  good: ExampleSnippet
): RefactorExample =>
  new RefactorExample({
    bad: [bad],
    good: [good]
  })

export const refactorExampleTrees = (
  bad: NonEmptyExampleTree,
  good: NonEmptyExampleTree
): RefactorExample => new RefactorExample({ bad, good })

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

  return exists ? fs.statSync(absolutePath).isDirectory() : false
}

const entryAbsolutePath =
  (directory: string) =>
  (entry: fs.Dirent): string =>
    path.join(directory, entry.name)

const collectTypeScriptFiles: (
  directory: string
) => Effect.Effect<ReadonlyArray<string>, ExampleLoadError> = Effect.fn(
  "collectTypeScriptFiles"
)(function* (directory: string) {
  const entries = yield* readDirectoryEntries(directory)
  const absoluteOf = entryAbsolutePath(directory)
  const nested = yield* Effect.forEach(entries, (entry) => {
    const absolute = absoluteOf(entry)

    if (entry.isDirectory()) {
      return collectTypeScriptFiles(absolute)
    }

    const typescript = entry.name.endsWith(".ts")
    const declaration = entry.name.endsWith(".d.ts")
    const notDeclaration = !declaration
    const isSource = typescript ? notDeclaration : false
    const keep = entry.isFile() ? isSource : false

    return Effect.succeed(keep ? [absolute] : [])
  })

  const flattened = Array.flatten(nested)

  return Array.sort(flattened, byPath)
})

const toPosixPath =
  (treeRoot: string) =>
  (absoluteFile: string): string => {
    const relative = path.relative(treeRoot, absoluteFile)
    const segments = relative.split(path.sep)

    return Array.join(segments, "/")
  }

const snippetFromFile =
  (treeRoot: string) =>
  (absoluteFile: string): Effect.Effect<ExampleSnippet, ExampleLoadError> =>
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
      const filePath = toPosixPath(treeRoot)(absoluteFile)

      return exampleSnippet(filePath, code)
    })

const nonEmptySnippets =
  (treeRoot: string) =>
  (
    snippets: ReadonlyArray<ExampleSnippet>
  ): Effect.Effect<NonEmptyExampleTree, ExampleLoadError> =>
    pipe(
      snippets,
      Array.matchLeft({
        onEmpty: () => {
          const error = new ExampleLoadError({
            message: `Example tree has no TypeScript files: ${treeRoot}`
          })

          return Effect.fail(error)
        },
        onNonEmpty: (first, rest) => {
          const tree = Array.prepend(rest, first)

          return Effect.succeed(tree)
        }
      })
    )

const readExampleTree: (
  treeRoot: string
) => Effect.Effect<NonEmptyExampleTree, ExampleLoadError> = Effect.fn(
  "readExampleTree"
)(function* (treeRoot: string) {
  const absoluteFiles = yield* collectTypeScriptFiles(treeRoot)
  const toSnippet = snippetFromFile(treeRoot)
  const snippets = yield* Effect.forEach(absoluteFiles, toSnippet)

  return yield* nonEmptySnippets(treeRoot)(snippets)
})

const completePairName =
  (exampleRoot: string) =>
  (entry: fs.Dirent): ReadonlyArray<string> => {
    if (!entry.isDirectory()) {
      return []
    }

    const pairRoot = path.join(exampleRoot, entry.name)
    const badRoot = path.join(pairRoot, "bad")
    const goodRoot = path.join(pairRoot, "good")
    const hasBad = directoryExists(badRoot)
    const hasGood = directoryExists(goodRoot)
    const complete = hasBad ? hasGood : false

    return complete ? [entry.name] : []
  }

const loadPair =
  (exampleRoot: string) =>
  (pairName: string): Effect.Effect<RefactorExample, ExampleLoadError> =>
    Effect.gen(function* () {
      const pairRoot = path.join(exampleRoot, pairName)
      const badRoot = path.join(pairRoot, "bad")
      const goodRoot = path.join(pairRoot, "good")
      const bad = yield* readExampleTree(badRoot)
      const good = yield* readExampleTree(goodRoot)

      return new RefactorExample({ bad, good })
    })

const nonEmptyExamples =
  (exampleRoot: string) =>
  (
    examples: ReadonlyArray<RefactorExample>
  ): Effect.Effect<NonEmptyRefactorExamples, ExampleLoadError> =>
    pipe(
      examples,
      Array.matchLeft({
        onEmpty: () => {
          const error = new ExampleLoadError({
            message: `Expected example/<id>/{bad,good} directories under ${exampleRoot}`
          })

          return Effect.fail(error)
        },
        onNonEmpty: (first, rest) => {
          const nonEmpty = Array.prepend(rest, first)

          return Effect.succeed(nonEmpty)
        }
      })
    )

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
  const names = Array.flatMap(entries, completePairName(exampleRoot))
  const pairNames = Array.sort(names, byPairName)
  const examples = yield* Effect.forEach(pairNames, loadPair(exampleRoot))

  return yield* nonEmptyExamples(exampleRoot)(examples)
})

