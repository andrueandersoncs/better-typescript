import * as fs from "node:fs"
import * as path from "node:path"
import {
  Array,
  Effect,
  Function,
  HashMap,
  Match,
  Option,
  Order,
  SynchronizedRef,
  Tuple,
  pipe
} from "effect"
import {
  DirectoryRefactorExamples,
  ExampleLoadError,
  ExampleSnippet,
  InlineRefactorExamples,
  type RefactorExampleSource,
  RefactorExample
} from "./data.js"

const makeExampleSnippet = (filePath: string, code: string) =>
  ExampleSnippet.make({ filePath, code })

const makeInlineRefactorExamples = (examples: ReadonlyArray<RefactorExample>) =>
  InlineRefactorExamples.make({ examples })

export const makeDirectoryRefactorExamples = (root: string) =>
  DirectoryRefactorExamples.make({ root })

const emptyExamples = Array.empty<RefactorExample>()

export const emptyRefactorExampleSource: RefactorExampleSource =
  makeInlineRefactorExamples(emptyExamples)

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

const byPath = Order.String
const byPairName = Order.String

const collectDirectoryEntries = (
  directory: string
): Effect.Effect<ReadonlyArray<fs.Dirent>, ExampleLoadError> =>
  Effect.try({
    try: () => fs.readdirSync(directory, { withFileTypes: true }),
    catch: () =>
      new ExampleLoadError({
        message: `Unable to read example directory: ${directory}`
      })
  })

const directoryExists = (absolutePath: string) => {
  const exists = fs.existsSync(absolutePath)

  return exists && fs.statSync(absolutePath).isDirectory()
}

const collectTypeScriptFiles: (
  directory: string
) => Effect.Effect<ReadonlyArray<string>, ExampleLoadError> = Effect.fn(
  "Example.collectTypeScriptFiles"
)(function* (directory: string) {
  const entries = yield* collectDirectoryEntries(directory)

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
})

const readExampleTree: (
  treeRoot: string
) => Effect.Effect<Array.NonEmptyReadonlyArray<ExampleSnippet>, ExampleLoadError> = Effect.fn(
  "Example.readExampleTree"
)(function* (treeRoot: string) {
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

      return makeExampleSnippet(filePath, code)
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

const loadRefactorExamplesAt: (
  exampleRoot: string
) => Effect.Effect<Array.NonEmptyReadonlyArray<RefactorExample>, ExampleLoadError> = Effect.fn(
  "Example.loadRefactorExamplesAt"
)(function* (exampleRoot: string) {
  if (!directoryExists(exampleRoot)) {
    return yield* new ExampleLoadError({
      message: `Missing example directory: ${exampleRoot}`
    })
  }

  const entries = yield* collectDirectoryEntries(exampleRoot)

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

      return RefactorExample.make({ bad, good })
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

// ResolveRefactorExamples loads only when reporting because construction must stay inert.
export type ResolveRefactorExamples = (
  source: RefactorExampleSource
) => Effect.Effect<ReadonlyArray<RefactorExample>, ExampleLoadError>

// One resolver caches successful directory loads because a watch run shares one report program.
export const makeRefactorExampleResolver = Effect.fn("Example.makeRefactorExampleResolver")(
  function* () {
    const emptyCache = HashMap.empty<string, Array.NonEmptyReadonlyArray<RefactorExample>>()
    const cache = yield* SynchronizedRef.make(emptyCache)

    const collectDirectory = Effect.fn("Example.collectDirectory")(function* (root: string) {
      return yield* SynchronizedRef.modifyEffect(cache, (current) => {
        const cached = HashMap.get(current, root)

        if (Option.isSome(cached)) {
          const cachedEntry = Tuple.make(cached.value, current)
          return Effect.succeed(cachedEntry)
        }

        return pipe(
          loadRefactorExamplesAt(root),
          Effect.map((loaded) => {
            const next = HashMap.set(current, root, loaded)

            return Tuple.make(loaded, next)
          })
        )
      })
    })

    const collectDirectoryExamples = Effect.fn("Example.collectDirectoryExamples")(function* (
      root: string
    ) {
      const current = yield* SynchronizedRef.get(cache)

      return yield* pipe(
        HashMap.get(current, root),
        Option.match({
          onNone: () => collectDirectory(root),
          onSome: Effect.succeed
        })
      )
    })

    const resolve = Effect.fn("Example.resolve")(function* (source: RefactorExampleSource) {
      return yield* pipe(
        Match.value(source),
        Match.tag("inline", (inline) => Effect.succeed(inline.examples)),
        Match.tag("directory", (directory) => collectDirectoryExamples(directory.root)),
        Match.exhaustive
      )
    })

    return resolve
  }
)()
