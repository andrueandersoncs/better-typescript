import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Array, Effect, Result, Stream, pipe } from "effect"
import * as ts from "typescript"
import type { Check } from "@better-typescript/core/engine/check/data"
import { Detection, Location } from "@better-typescript/core/engine/location/data"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import type { NamedCheck, Wiring, WiringConfig } from "@better-typescript/core/engine/wiring/data"
import {
  defineConfig,
  makeWiring,
  makeNamedCheck,
  makeSilentCheck
} from "@better-typescript/core/engine/wiring"
import { signalOf } from "@better-typescript/core/engine/signal"
import { withFallbackAdvice } from "@better-typescript/core/engine/report"
import type { ReportEvent } from "@better-typescript/core/engine/report/data"
import { makeDirectoryRefactorExamples } from "@better-typescript/core/engine/example"
import {
  makeExampleSnippet,
  makeInlineRefactorExamples,
  makeRefactorExample
} from "./exampleHelpers.js"
import type { ExampleLoadError } from "@better-typescript/core/engine/example/data"
import { defaultConfig } from "@better-typescript/checks/preset/defaultWiring"
import {
  astNodesIn,
  makeContext,
  foldAst,
  isProjectSourceFile
} from "@better-typescript/core/engine/sources"
import { makeReportEvent } from "@better-typescript/core/engine/watch"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  makeCheckFromSubscriptions,
  makeDetection,
  fileCheck,
  nodeCheck
} from "@better-typescript/core/engine/check"
import type {
  LoadedProject,
  LoadedWorkspace
} from "@better-typescript/core/project/loadProject/data"

const probeExamples = makeInlineRefactorExamples([
  makeRefactorExample(
    makeExampleSnippet("src/cases.ts", `throw new Error("boom")`),
    makeExampleSnippet("src/cases.ts", `yield* new BoomError()`)
  )
])

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = (name: string): string => path.join(testDirectory, "fixtures", name)
const noThrowFixturePath = fixturePath("no-throw")
const probeMessage = "throw statement"
const probeHint = "yield typed errors instead of throwing"

const loadFixtureWorkspace = (name: string): Promise<LoadedWorkspace> =>
  Effect.runPromise(loadProject(fixturePath(name)))

const loadFixtureProject = async (name: string): Promise<LoadedProject> => {
  const workspace = await loadFixtureWorkspace(name)
  const [project] = workspace.projects

  assert.ok(project, `expected ${name} fixture to load one TypeScript project`)

  return project
}

const collectStream = <A, E>(stream: Stream.Stream<A, E>): Promise<ReadonlyArray<A>> =>
  Effect.runPromise(Stream.runCollect(stream))

const reportEvents =
  <DeriveError>(config: WiringConfig<DeriveError>) =>
  <UpdateError, R>(
    updates: Stream.Stream<WorkspaceUpdate, UpdateError, R>
  ): Stream.Stream<ReportEvent, DeriveError | UpdateError | ExampleLoadError, R> =>
    Stream.unwrap(
      pipe(
        makeReportEvent(config),
        Effect.map((report) => report(updates))
      )
    )

const reportTexts =
  <E>(config: WiringConfig<E>) =>
  (workspace: LoadedWorkspace): Stream.Stream<string, E | ExampleLoadError> => {
    const update = new WorkspaceUpdate({
      rootPath: workspace.rootPath,
      contexts: workspace.projects.map((project) => makeContext(project.rootPath)(project.program))
    })

    return pipe(
      Stream.succeed(update),
      reportEvents(config),
      Stream.filterMap((event) =>
        event._tag === "signal" ? Result.succeed(event.text) : Result.failVoid
      )
    )
  }

const relativeFileName = (project: LoadedProject, sourceFile: ts.SourceFile): string =>
  path.relative(project.rootPath, sourceFile.fileName).replaceAll(path.sep, "/")

const nodeSignature =
  (project: LoadedProject) =>
  ({
    sourceFile,
    node
  }: {
    readonly sourceFile: ts.SourceFile
    readonly node: ts.Node
  }): string => {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))

    return [
      relativeFileName(project, sourceFile),
      ts.SyntaxKind[node.kind],
      position.line + 1,
      position.character + 1
    ].join(":")
  }

const collectAstSignatures = (project: LoadedProject): ReadonlyArray<string> => {
  const sourceFiles = pipe(project.program.getSourceFiles(), Array.filter(isProjectSourceFile))
  const signature = nodeSignature(project)

  return Array.flatMap(sourceFiles, (sourceFile) =>
    pipe(
      Array.fromIterable(astNodesIn(sourceFile)),
      Array.map((node) => signature({ sourceFile, node }))
    )
  )
}

const throwProbeCheck: Check = nodeCheck([ts.SyntaxKind.ThrowStatement])(ts.isThrowStatement)(
  (context) => (node) => [
    makeDetection(context)({
      node,
      message: probeMessage,
      hint: probeHint
    })
  ]
)

const throwProbeNamedCheck: NamedCheck = makeNamedCheck(
  "probe throw statements",
  throwProbeCheck,
  probeExamples
)

const silentProbeNamedCheck: NamedCheck = makeSilentCheck(
  "silent-only probe",
  fileCheck(() => [
    Detection.make({
      location: location("src/silent-observation.ts", 1, 1),
      message: "silent observation",
      hint: "silent observations only feed advice"
    })
  ])
)

const detectionRecord = (element: Detection) => ({
  path: element.location.path,
  line: element.location.line,
  column: element.location.column,
  message: element.message,
  hint: element.hint
})

const expectedThrowProbeElements = [
  {
    path: "src/cases.ts",
    line: 4,
    column: 3,
    message: probeMessage,
    hint: probeHint
  },
  {
    path: "src/cases.ts",
    line: 9,
    column: 5,
    message: probeMessage,
    hint: probeHint
  },
  {
    path: "src/cases.ts",
    line: 19,
    column: 5,
    message: probeMessage,
    hint: probeHint
  },
  {
    path: "src/cases.ts",
    line: 26,
    column: 3,
    message: probeMessage,
    hint: probeHint
  }
]

const location = (filePath: string, line: number, column: number): Location =>
  Location.make({ path: filePath, line, column })

const advice = (
  level: Advice["level"],
  filePath: string,
  title: string,
  remediation = `fix ${title}`
): Advice => ({
  location: location(filePath, 1, 1),
  level,
  title,
  remediation,
  evidence: [{ measure: `${title} evidence`, count: 1 }],
  examples: probeExamples
})

const firstLines = (blocks: ReadonlyArray<string>): ReadonlyArray<string> =>
  blocks.map((block) => block.split("\n")[0])

const delayedSource = <A>(items: ReadonlyArray<A>): Stream.Stream<A> =>
  pipe(
    Stream.fromIterable(items),
    Stream.mapEffect((item) => pipe(Effect.sleep("1 millis"), Effect.as(item)))
  )

const noDerive: Wiring["derive"] = () => Stream.empty

const fixedCheck = (elements: ReadonlyArray<Detection>): Check => fileCheck(() => elements)

const testWiring = (
  checks: ReadonlyArray<NamedCheck>,
  derive: Wiring["derive"] = noDerive
): Wiring => makeWiring({ checks, derive })

const configFor = (wiring: Wiring, files: WiringConfig[number]["files"] = ["**/*"]): WiringConfig =>
  defineConfig([{ files, wiring }])

const reportFromTestWiring = (wiring: Wiring) => reportTexts(configFor(wiring))

const noOpCheck: Check = makeCheckFromSubscriptions(() => [])

const namedNoOpCheck = (name: string): NamedCheck => makeNamedCheck(name, noOpCheck, probeExamples)

const silentNoOpCheck = (name: string): NamedCheck => makeSilentCheck(name, noOpCheck)

const thrownMessage = (run: () => unknown): string => {
  try {
    run()
  } catch (error) {
    assert.ok(error instanceof Error, "expected an Error to be thrown")

    return error.message
  }

  assert.fail("expected an Error to be thrown")
}

test("astNodesIn emits fixture AST elements in stable traversal order", async () => {
  const project = await loadFixtureProject("no-throw")
  const firstRun = collectAstSignatures(project)
  const secondRun = collectAstSignatures(project)

  assert.ok(firstRun.length > 0, "expected the fixture project to emit AST nodes")
  assert.deepEqual(secondRun, firstRun, "expected AST traversal order to be deterministic")
})

test("foldAst traverses deeply nested trees without call stack recursion", () => {
  const depth = 20_000
  const root = globalThis.Array.from({ length: depth }).reduce<ts.Expression>(
    (expression) => ts.factory.createParenthesizedExpression(expression),
    ts.factory.createIdentifier("value")
  )
  const nodeCount = foldAst((count: number) => count + 1)(root)(0)

  assert.equal(nodeCount, depth + 1)
})

test("runCheckOnProject applies probe subscriptions to matching fixture nodes", async () => {
  const project = await loadFixtureProject("no-throw")
  const elements = await Effect.runPromise(runCheckOnProject(Array.of(throwProbeCheck))(project))

  assert.deepEqual(
    elements.map(detectionRecord),
    expectedThrowProbeElements,
    "expected the probe check to report every throw statement with source locations in fixture order"
  )
})

test("glob config runs every wiring whose file patterns match", async () => {
  const fileProbe: Check = fileCheck((context) => [
    makeDetection(context)({
      node: context.sourceFile,
      message: "visited glob-matched file",
      hint: "run each wiring only on matching files"
    })
  ])
  const alphaWiring = testWiring([makeNamedCheck("alpha files", fileProbe, probeExamples)])
  const betaWiring = testWiring([makeNamedCheck("beta file", fileProbe, probeExamples)])
  const allPackagesWiring = testWiring([
    makeNamedCheck("all package files", fileProbe, probeExamples)
  ])
  const config = defineConfig([
    {
      files: ["packages/*/src/alpha.?s"],
      wiring: alphaWiring
    },
    {
      files: ["packages/{alpha,beta}/src/beta.ts"],
      wiring: betaWiring
    },
    {
      files: ["packages/**/src/*.ts"],
      wiring: allPackagesWiring
    }
  ])
  const workspace = await loadFixtureWorkspace("glob-wirings")
  const blocks = await collectStream(reportTexts(config)(workspace))

  assert.deepEqual(firstLines(blocks), ["alpha files", "beta file", "all package files"])
  assert.deepEqual(
    blocks.map((block) => block.split("\n").filter((line) => line.endsWith(":1:1"))),
    [["  src/alpha.ts:1:1"], ["  src/beta.ts:1:1"], ["  src/alpha.ts:1:1", "  src/beta.ts:1:1"]]
  )
})

test("glob config excludes negated patterns from a positive scope", async () => {
  const fileProbe: Check = fileCheck((context) => [
    makeDetection(context)({
      node: context.sourceFile,
      message: "visited included glob file",
      hint: "exclude configured paths from a positive scope"
    })
  ])
  const wiring = testWiring([makeNamedCheck("included package files", fileProbe, probeExamples)])
  const config = defineConfig([
    {
      files: ["packages/**/src/*.ts", "!packages/beta/**"],
      wiring
    }
  ])
  const workspace = await loadFixtureWorkspace("glob-wirings")
  const blocks = await collectStream(reportTexts(config)(workspace))

  assert.deepEqual(
    blocks.map((block) => block.split("\n").filter((line) => line.endsWith(":1:1"))),
    [["  src/alpha.ts:1:1"]]
  )
})

test("each glob wiring derives from only its matching files", async () => {
  const fileProbe: Check = fileCheck((context) => [
    makeDetection(context)({
      node: context.sourceFile,
      message: "derived glob input",
      hint: "derive independently per wiring"
    })
  ])
  const alphaWiring = testWiring(
    [makeNamedCheck("alpha derived input", fileProbe, probeExamples)],
    (signals) => {
      const count = signals[0]?.detections.length ?? 0

      return Stream.fromIterable([
        advice("directory", "packages/alpha", `alpha detections ${count}`)
      ])
    }
  )
  const betaWiring = testWiring(
    [makeNamedCheck("beta derived input", fileProbe, probeExamples)],
    (signals) => {
      const count = signals[0]?.detections.length ?? 0

      return Stream.fromIterable([advice("directory", "packages/beta", `beta detections ${count}`)])
    }
  )
  const config = defineConfig([
    { files: ["packages/alpha/**/*.ts"], wiring: alphaWiring },
    { files: ["packages/beta/**/*.ts"], wiring: betaWiring }
  ])
  const workspace = await loadFixtureWorkspace("glob-wirings")
  const blocks = await collectStream(reportTexts(config)(workspace))

  assert.deepEqual(firstLines(blocks), [
    "packages/alpha [directory] — alpha detections 1",
    "packages/beta [directory] — beta detections 1",
    "alpha derived input",
    "beta derived input"
  ])
})

test("reportEvents analyzes referenced projects sequentially", async () => {
  const check = makeNamedCheck(
    "visited source files",
    fileCheck((context) => [
      makeDetection(context)({
        node: context.sourceFile,
        message: "visited source file",
        hint: "analyze every referenced project"
      })
    ]),
    probeExamples
  )
  const workspace = await Effect.runPromise(loadProject(fixturePath("glob-wirings")))
  const update = new WorkspaceUpdate({
    rootPath: workspace.rootPath,
    contexts: workspace.projects.map((project) => makeContext(project.rootPath)(project.program))
  })
  const blocks = await collectStream(
    pipe(
      Stream.succeed(update),
      reportEvents(configFor(testWiring([check]))),
      Stream.filterMap((event) =>
        event._tag === "signal" ? Result.succeed(event.text) : Result.failVoid
      )
    )
  )

  assert.equal(workspace.projects.length, 2)
  assert.deepEqual(
    blocks[0]?.split("\n").filter((line) => line.endsWith(":1:1")),
    ["  src/alpha.ts:1:1", "  src/beta.ts:1:1"]
  )
})

test("an unmatched glob wiring invokes neither checks nor derive", async () => {
  const mustNotRun: Check = makeCheckFromSubscriptions(() => {
    throw new Error("check ran")
  })
  const wiring = testWiring([makeNamedCheck("absent files", mustNotRun, probeExamples)], () => {
    throw new Error("derive ran")
  })
  const config = configFor(wiring, ["missing/**/*.ts"])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(reportTexts(config)(workspace))

  assert.deepEqual(blocks, [])
})

test("reportEvents does not load examples for a check without detections", async () => {
  const missingExamples = makeDirectoryRefactorExamples(fixturePath("missing-report-examples"))
  const noOutputCheck = makeNamedCheck("no output", noOpCheck, missingExamples)
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(reportFromTestWiring(testWiring([noOutputCheck]))(workspace))

  assert.deepEqual(blocks, [])
})

test("glob wiring drops detections outside its matched files", async () => {
  const outsideDetection = Detection.make({
    location: location("src/allowed.ts", 1, 1),
    message: "outside configured glob",
    hint: "drop this detection"
  })
  const check = makeNamedCheck("outside detection", fixedCheck([outsideDetection]), probeExamples)
  const config = configFor(testWiring([check]), ["src/cases.ts"])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(reportTexts(config)(workspace))

  assert.deepEqual(blocks, [])
})

test("reportEvents collapses duplicate workspace detections by check and location", async () => {
  const workspace = await Effect.runPromise(loadProject(noThrowFixturePath))
  const [project] = workspace.projects

  assert.ok(project, "expected no-throw fixture to load one TypeScript project")

  const duplicatedWorkspace: LoadedWorkspace = {
    ...workspace,
    projects: [project, project]
  }
  const blocks = await collectStream(
    reportFromTestWiring(testWiring([throwProbeNamedCheck]))(duplicatedWorkspace)
  )

  assert.equal(blocks.length, 1)
  assert.deepEqual(
    blocks[0]?.split("\n").filter((line) => /^  [^ ].*:\d+:\d+$/.test(line)),
    expectedThrowProbeElements.map(
      ({ path: filePath, line, column }) => `  ${filePath}:${line}:${column}`
    ),
    "expected duplicate project emissions to collapse by path, line, column, message, and hint"
  )
})

test("reportEvents preserves two distinct detections emitted at the same AST location", async () => {
  const doubleDetectionCheck: Check = nodeCheck([ts.SyntaxKind.ThrowStatement])(
    ts.isThrowStatement
  )((context) => (node) => {
    const element = makeDetection(context)

    return [
      element({
        node,
        message: "first interpretation",
        hint: "handle the first interpretation"
      }),
      element({
        node,
        message: "second interpretation",
        hint: "handle the second interpretation"
      })
    ]
  })
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromTestWiring(
      testWiring([makeNamedCheck("two messages on one node", doubleDetectionCheck, probeExamples)])
    )(workspace)
  )

  assert.equal(blocks.length, 2)
  assert.deepEqual(
    blocks.map((block) => block.split("\n")[1]),
    ["  first interpretation", "  second interpretation"]
  )
  assert.ok(
    blocks[0]?.includes("  src/cases.ts:4:3"),
    "expected the first detection block to include the shared throw statement location"
  )
  assert.ok(
    blocks[1]?.includes("  src/cases.ts:4:3"),
    "expected the second detection block to include the same throw statement location"
  )
})

test("reportEvents renders advice remediation examples before evidence", async () => {
  const fixedAdvice = {
    location: location("src/cases.ts", 4, 3),
    level: "file" as const,
    title: "high signal density",
    remediation: "split the module before changing individual checks",
    evidence: [
      { measure: "signals", count: 12 },
      { measure: "no-throw", count: 4 }
    ],
    examples: probeExamples
  }
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromTestWiring(testWiring([], () => Stream.fromIterable([fixedAdvice])))(workspace)
  )

  assert.deepEqual(blocks, [
    [
      "src/cases.ts [file] — high signal density",
      "  fix: split the module before changing individual checks",
      "  Bad (src/cases.ts):",
      '    throw new Error("boom")',
      "  Good (src/cases.ts):",
      "    yield* new BoomError()",
      "  evidence: signals: 12",
      "  evidence: no-throw: 4"
    ].join("\n")
  ])
})

test("reportEvents groups locations under the check prose name, message, and hint", async () => {
  const groupedCheck = makeNamedCheck(
    "probe throw statements",
    fixedCheck([
      Detection.make({
        location: location("src/cases.ts", 4, 3),
        message: probeMessage,
        hint: probeHint
      }),
      Detection.make({
        location: location("src/cases.ts", 9, 5),
        message: probeMessage,
        hint: probeHint
      })
    ]),
    probeExamples
  )
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(reportFromTestWiring(testWiring([groupedCheck]))(workspace))

  assert.deepEqual(blocks, [
    [
      "probe throw statements",
      `  ${probeMessage}`,
      `  Hint: ${probeHint}`,
      "  Bad (src/cases.ts):",
      '    throw new Error("boom")',
      "  Good (src/cases.ts):",
      "    yield* new BoomError()",
      "  src/cases.ts:4:3",
      "  src/cases.ts:9:5"
    ].join("\n")
  ])
})

test("reportEvents splits one check into distinct message and hint groups", async () => {
  const splitCheck = makeNamedCheck(
    "probe throw statements",
    fixedCheck([
      Detection.make({
        location: location("src/cases.ts", 4, 3),
        message: "throw statement",
        hint: "yield typed errors instead of throwing"
      }),
      Detection.make({
        location: location("src/cases.ts", 9, 5),
        message: "throw statement",
        hint: "yield typed errors instead of throwing"
      }),
      Detection.make({
        location: location("src/cases.ts", 19, 5),
        message: "throw expression",
        hint: "yield typed errors instead of throwing"
      }),
      Detection.make({
        location: location("src/cases.ts", 26, 3),
        message: "throw statement",
        hint: "return error values instead"
      })
    ]),
    probeExamples
  )
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(reportFromTestWiring(testWiring([splitCheck]))(workspace))

  assert.deepEqual(blocks, [
    [
      "probe throw statements",
      "  throw statement",
      "  Hint: yield typed errors instead of throwing",
      "  Bad (src/cases.ts):",
      '    throw new Error("boom")',
      "  Good (src/cases.ts):",
      "    yield* new BoomError()",
      "  src/cases.ts:4:3",
      "  src/cases.ts:9:5"
    ].join("\n"),
    [
      "probe throw statements",
      "  throw expression",
      "  Hint: yield typed errors instead of throwing",
      "  Bad (src/cases.ts):",
      '    throw new Error("boom")',
      "  Good (src/cases.ts):",
      "    yield* new BoomError()",
      "  src/cases.ts:19:5"
    ].join("\n"),
    [
      "probe throw statements",
      "  throw statement",
      "  Hint: return error values instead",
      "  Bad (src/cases.ts):",
      '    throw new Error("boom")',
      "  Good (src/cases.ts):",
      "    yield* new BoomError()",
      "  src/cases.ts:26:3"
    ].join("\n")
  ])
})

test("reportEvents orders advice before check blocks and sorts advice by level then path", async () => {
  const fixedAdvice = Stream.fromIterable([
    advice("project", "ignored.ts", "project advice"),
    advice("file", "src/z.ts", "file z advice"),
    advice("directory", "src", "directory advice"),
    advice("file", "src/a.ts", "file a advice")
  ])
  const groupedCheck = makeNamedCheck(
    "probe throw statements",
    fixedCheck([
      Detection.make({
        location: location("src/cases.ts", 4, 3),
        message: probeMessage,
        hint: probeHint
      })
    ]),
    probeExamples
  )
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromTestWiring(testWiring([groupedCheck], () => fixedAdvice))(workspace)
  )

  assert.deepEqual(firstLines(blocks), [
    "src/a.ts [file] — file a advice",
    "src/z.ts [file] — file z advice",
    "src [directory] — directory advice",
    "project [project] — project advice",
    "probe throw statements"
  ])

  assert.equal(
    blocks[4],
    [
      "probe throw statements",
      `  ${probeMessage}`,
      `  Hint: ${probeHint}`,
      "  Bad (src/cases.ts):",
      '    throw new Error("boom")',
      "  Good (src/cases.ts):",
      "    yield* new BoomError()",
      "  src/cases.ts:4:3"
    ].join("\n")
  )
})

test("reportEvents preserves asynchronously emitted advice", async () => {
  const delayedCheck = makeNamedCheck(
    "probe throw statements",
    fixedCheck([
      Detection.make({
        location: location("src/cases.ts", 4, 3),
        message: probeMessage,
        hint: probeHint
      })
    ]),
    probeExamples
  )
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromTestWiring(
      testWiring([delayedCheck], () =>
        delayedSource([
          advice("file", "src/z.ts", "file z advice"),
          advice("file", "src/a.ts", "file a advice")
        ])
      )
    )(workspace)
  )

  assert.deepEqual(firstLines(blocks), [
    "src/a.ts [file] — file a advice",
    "src/z.ts [file] — file z advice",
    "probe throw statements"
  ])
})

test("reportEvents preserves the derivation error channel", async () => {
  const workspace = await loadFixtureWorkspace("no-throw")
  const failure = "derive failure" as const

  const fallibleWiring = makeWiring({
    checks: [],
    derive: () => Stream.fail(failure)
  })

  const fallibleConfig = defineConfig([{ files: ["**/*"], wiring: fallibleWiring }])

  const output: Stream.Stream<string, typeof failure | ExampleLoadError> =
    reportTexts(fallibleConfig)(workspace)

  const actual = await Effect.runPromise(pipe(output, Stream.runCollect, Effect.flip))

  assert.equal(actual, failure)
})

test("report stream emits check blocks and omits silent checks", async () => {
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(reportTexts(defaultConfig)(workspace))
  const headers = firstLines(blocks)

  assert.ok(headers.includes("no-throw"), "expected the no-throw check to emit a report block")
  assert.equal(
    headers.includes("prefer-curried-data-last-functions"),
    false,
    "expected silent checks to stay out of report blocks"
  )
})

test("reportEvents lets silent checks influence advice without rendering local check blocks", async () => {
  const silentInfluencedAdvice = (
    silentDetections: ReadonlyArray<Detection>
  ): ReadonlyArray<Advice> =>
    silentDetections.length > 0
      ? [
          {
            location: location("project", 1, 1),
            level: "project",
            title: "silent-influenced advice",
            remediation: "act on silent-derived evidence",
            evidence: [
              {
                measure: silentProbeNamedCheck.name,
                count: silentDetections.length
              }
            ],
            examples: probeExamples
          }
        ]
      : []
  const silentInfluencedWiring: Wiring = makeWiring({
    checks: [throwProbeNamedCheck, silentProbeNamedCheck],
    derive: (signals) =>
      pipe(
        signalOf(signals)(silentProbeNamedCheck.name),
        Stream.runCollect,
        Effect.map(silentInfluencedAdvice),
        Effect.map(Stream.fromIterable),
        Stream.unwrap
      )
  })
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(reportFromTestWiring(silentInfluencedWiring)(workspace))
  const headers = firstLines(blocks)

  assert.ok(
    headers.includes("project [project] — silent-influenced advice"),
    "expected advice to consume silent check output"
  )
  assert.ok(
    headers.includes(throwProbeNamedCheck.name),
    "expected configured reported checks to render report blocks"
  )
  assert.equal(
    headers.includes(silentProbeNamedCheck.name),
    false,
    "expected silent checks to feed advice without rendering report blocks"
  )
})

test("report collects the exported report stream for a loaded workspace", async () => {
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(reportTexts(defaultConfig)(workspace))

  assert.equal(
    blocks.some((block) => block.length === 0),
    false,
    "expected the exported report stream to collect renderable text blocks when it emits"
  )
})

test("withFallbackAdvice emits specific advice before applicable fallback and runs specific effects once per invocation", async () => {
  const specificA = advice("file", "src/a.ts", "specific a")
  const fallbackA = advice("file", "src/a.ts", "density fallback a")
  const fallbackB = advice("file", "src/b.ts", "density fallback b")
  let specificEffects = 0
  const collectInvocation = (): Promise<ReadonlyArray<Advice>> =>
    collectStream(
      withFallbackAdvice(
        pipe(
          Stream.fromIterable([specificA]),
          Stream.mapEffect((item) =>
            Effect.sync(() => {
              specificEffects += 1

              return item
            })
          )
        ),
        Stream.fromIterable([fallbackA, fallbackB])
      )
    )
  const first = await collectInvocation()
  const second = await collectInvocation()
  assert.deepEqual(
    first.map((item) => [item.location.path, item.title]),
    [
      ["src/a.ts", "specific a"],
      ["src/b.ts", "density fallback b"]
    ]
  )
  assert.deepEqual(
    second.map((item) => [item.location.path, item.title]),
    [
      ["src/a.ts", "specific a"],
      ["src/b.ts", "density fallback b"]
    ]
  )
  assert.equal(
    specificEffects,
    2,
    "expected the specific stream side effect to run once for each withFallbackAdvice invocation"
  )
})

test("makeWiring rejects duplicate reported check names and reports the collisions", () => {
  const message = thrownMessage(() =>
    makeWiring(testWiring([namedNoOpCheck("same-check"), namedNoOpCheck("same-check")]))
  )

  assert.match(message, /Duplicate check names: same-check/)
})

test("makeWiring rejects duplicate silent check names and reports the collisions", () => {
  const message = thrownMessage(() =>
    makeWiring(testWiring([silentNoOpCheck("same-check"), silentNoOpCheck("same-check")]))
  )

  assert.match(message, /Duplicate check names: same-check/)
})

test("makeWiring rejects duplicate names across reported and silent checks", () => {
  const message = thrownMessage(() =>
    makeWiring(testWiring([namedNoOpCheck("shared-name"), silentNoOpCheck("shared-name")]))
  )

  assert.match(message, /Duplicate check names: shared-name/)
})
