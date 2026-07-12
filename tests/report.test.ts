import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Chunk, Effect, Stream, pipe } from "effect"
import * as ts from "typescript"
import { fileCheck, nodeCheck, type Check } from "../src/engine/check.js"
import { Detection, Location, locateNode } from "../src/engine/location.js"
import type { Advice } from "../src/engine/derive.js"
import {
  makeWiring,
  namedCheck,
  reportFromWiring,
  runCheckOnProject,
  signalOf,
  silentCheck,
  withFallbackAdvice,
  type NamedCheck,
  type Wiring
} from "../src/engine/report.js"
import { report } from "../src/preset.js"
import { astNodes } from "../src/engine/sources.js"
import { loadProject } from "../src/project/loadProject.js"
import type {
  LoadedProject,
  LoadedWorkspace
} from "../src/project/loadProject.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = (name: string): string =>
  path.join(testDirectory, "fixtures", name)
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

const collectStream = <A>(
  stream: Stream.Stream<A, Error>
): Promise<ReadonlyArray<A>> =>
  Effect.runPromise(
    Effect.map(Stream.runCollect(stream), Chunk.toReadonlyArray)
  )

const relativeFileName = (
  project: LoadedProject,
  sourceFile: ts.SourceFile
): string =>
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
    const position = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile)
    )

    return [
      relativeFileName(project, sourceFile),
      ts.SyntaxKind[node.kind],
      position.line + 1,
      position.character + 1
    ].join(":")
  }

const collectAstSignatures = async (
  project: LoadedProject
): Promise<ReadonlyArray<string>> => {
  const nodes = await collectStream(astNodes(project))

  return nodes.map(nodeSignature(project))
}

const throwProbeCheck: Check = nodeCheck([ts.SyntaxKind.ThrowStatement])(
  ts.isThrowStatement
)((context) => (node) => [
  new Detection({
    location: locateNode(context)(node),
    message: probeMessage,
    hint: probeHint
  })
])

const throwProbeNamedCheck: NamedCheck = namedCheck(
  "probe throw statements",
  throwProbeCheck
)

const silentProbeNamedCheck: NamedCheck = silentCheck(
  "silent-only probe",
  fileCheck(() => [
    new Detection({
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
  new Location({ path: filePath, line, column })

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
  evidence: [{ measure: `${title} evidence`, count: 1 }]
})

const firstLines = (blocks: ReadonlyArray<string>): ReadonlyArray<string> =>
  blocks.map((block) => block.split("\n")[0])

const delayedSource = <A>(items: ReadonlyArray<A>): Stream.Stream<A, Error> =>
  pipe(
    Stream.fromIterable(items),
    Stream.mapEffect((item) => pipe(Effect.sleep("1 millis"), Effect.as(item)))
  )

const noDerive: Wiring["derive"] = () => Stream.empty

const fixedCheck =
  (elements: ReadonlyArray<Detection>): Check =>
  () =>
    Stream.fromIterable(elements)

const testWiring = (
  checks: ReadonlyArray<NamedCheck>,
  derive: Wiring["derive"] = noDerive
): Wiring => ({ checks, derive })

const noOpCheck: Check = () => Stream.empty

const namedNoOpCheck = (name: string): NamedCheck => namedCheck(name, noOpCheck)

const silentNoOpCheck = (name: string): NamedCheck =>
  silentCheck(name, noOpCheck)

const thrownError = (run: () => unknown): Error => {
  try {
    run()
  } catch (error) {
    assert.ok(error instanceof Error, "expected an Error to be thrown")

    return error
  }

  assert.fail("expected an Error to be thrown")
}

test("astNodes emits fixture AST elements in stable traversal order", async () => {
  const project = await loadFixtureProject("no-throw")
  const firstRun = await collectAstSignatures(project)
  const secondRun = await collectAstSignatures(project)

  assert.ok(
    firstRun.length > 0,
    "expected the fixture project to emit AST nodes"
  )
  assert.deepEqual(
    secondRun,
    firstRun,
    "expected AST traversal order to be deterministic"
  )
})

test("runCheckOnProject applies probe subscriptions to matching fixture nodes", async () => {
  const project = await loadFixtureProject("no-throw")
  const elements = await Effect.runPromise(
    runCheckOnProject(throwProbeCheck)(project)
  )

  assert.deepEqual(
    elements.map(detectionRecord),
    expectedThrowProbeElements,
    "expected the probe check to report every throw statement with source locations in fixture order"
  )
})

test("reportFromWiring collapses duplicate workspace detections by check and location", async () => {
  const workspace = await Effect.runPromise(loadProject(noThrowFixturePath))
  const [project] = workspace.projects

  assert.ok(project, "expected no-throw fixture to load one TypeScript project")

  const duplicatedWorkspace: LoadedWorkspace = {
    ...workspace,
    projects: [project, project]
  }
  const blocks = await collectStream(
    reportFromWiring(testWiring([throwProbeNamedCheck]))(duplicatedWorkspace)
  )

  assert.equal(blocks.length, 1)
  assert.deepEqual(
    blocks[0]?.split("\n").slice(3),
    expectedThrowProbeElements.map(
      ({ path: filePath, line, column }) => `  ${filePath}:${line}:${column}`
    ),
    "expected duplicate project emissions to collapse by path, line, column, message, and hint"
  )
})

test("reportFromWiring preserves two distinct detections emitted at the same AST location", async () => {
  const doubleDetectionCheck: Check = nodeCheck([ts.SyntaxKind.ThrowStatement])(
    ts.isThrowStatement
  )((context) => (node) => {
    const sharedLocation = locateNode(context)(node)

    return [
      new Detection({
        location: sharedLocation,
        message: "first interpretation",
        hint: "handle the first interpretation"
      }),
      new Detection({
        location: sharedLocation,
        message: "second interpretation",
        hint: "handle the second interpretation"
      })
    ]
  })
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromWiring(
      testWiring([namedCheck("two messages on one node", doubleDetectionCheck)])
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

test("reportFromWiring renders advice header, remediation, and evidence lines", async () => {
  const fixedAdvice = {
    location: location("src/cases.ts", 4, 3),
    level: "file" as const,
    title: "high signal density",
    remediation: "split the module before changing individual checks",
    evidence: [
      { measure: "signals", count: 12 },
      { measure: "no-throw", count: 4 }
    ]
  }
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromWiring(testWiring([], () => Stream.fromIterable([fixedAdvice])))(
      workspace
    )
  )

  assert.deepEqual(blocks, [
    [
      "src/cases.ts [file] — high signal density",
      "  fix: split the module before changing individual checks",
      "  evidence: signals: 12",
      "  evidence: no-throw: 4"
    ].join("\n")
  ])
})

test("reportFromWiring groups locations under the check prose name, message, and hint", async () => {
  const groupedCheck = namedCheck(
    "probe throw statements",
    fixedCheck([
      new Detection({
        location: location("src/cases.ts", 4, 3),
        message: probeMessage,
        hint: probeHint
      }),
      new Detection({
        location: location("src/cases.ts", 9, 5),
        message: probeMessage,
        hint: probeHint
      })
    ])
  )
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromWiring(testWiring([groupedCheck]))(workspace)
  )

  assert.deepEqual(blocks, [
    [
      "probe throw statements",
      `  ${probeMessage}`,
      `  Hint: ${probeHint}`,
      "  src/cases.ts:4:3",
      "  src/cases.ts:9:5"
    ].join("\n")
  ])
})

test("reportFromWiring splits one check into distinct message and hint groups", async () => {
  const splitCheck = namedCheck(
    "probe throw statements",
    fixedCheck([
      new Detection({
        location: location("src/cases.ts", 4, 3),
        message: "throw statement",
        hint: "yield typed errors instead of throwing"
      }),
      new Detection({
        location: location("src/cases.ts", 9, 5),
        message: "throw statement",
        hint: "yield typed errors instead of throwing"
      }),
      new Detection({
        location: location("src/cases.ts", 19, 5),
        message: "throw expression",
        hint: "yield typed errors instead of throwing"
      }),
      new Detection({
        location: location("src/cases.ts", 26, 3),
        message: "throw statement",
        hint: "return error values instead"
      })
    ])
  )
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromWiring(testWiring([splitCheck]))(workspace)
  )

  assert.deepEqual(blocks, [
    [
      "probe throw statements",
      "  throw statement",
      "  Hint: yield typed errors instead of throwing",
      "  src/cases.ts:4:3",
      "  src/cases.ts:9:5"
    ].join("\n"),
    [
      "probe throw statements",
      "  throw expression",
      "  Hint: yield typed errors instead of throwing",
      "  src/cases.ts:19:5"
    ].join("\n"),
    [
      "probe throw statements",
      "  throw statement",
      "  Hint: return error values instead",
      "  src/cases.ts:26:3"
    ].join("\n")
  ])
})

test("reportFromWiring orders advice before check blocks and sorts advice by level then path", async () => {
  const fixedAdvice = Stream.fromIterable([
    advice("project", "ignored.ts", "project advice"),
    advice("file", "src/z.ts", "file z advice"),
    advice("directory", "src", "directory advice"),
    advice("file", "src/a.ts", "file a advice")
  ])
  const groupedCheck = namedCheck(
    "probe throw statements",
    fixedCheck([
      new Detection({
        location: location("src/cases.ts", 4, 3),
        message: probeMessage,
        hint: probeHint
      })
    ])
  )
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromWiring(testWiring([groupedCheck], () => fixedAdvice))(workspace)
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
      "  src/cases.ts:4:3"
    ].join("\n")
  )
})

test("reportFromWiring preserves asynchronously emitted advice and check streams", async () => {
  const delayedCheck = namedCheck("probe throw statements", () =>
    delayedSource([
      new Detection({
        location: location("src/cases.ts", 4, 3),
        message: probeMessage,
        hint: probeHint
      })
    ])
  )
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromWiring(
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

test("report stream emits check blocks and omits silent checks", async () => {
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(report(workspace))
  const headers = firstLines(blocks)

  assert.ok(
    headers.includes("no-throw"),
    "expected the no-throw check to emit a report block"
  )
  assert.equal(
    headers.includes("prefer-curried-data-last-functions"),
    false,
    "expected silent checks to stay out of report blocks"
  )
})

test("reportFromWiring lets silent checks influence advice without rendering local check blocks", async () => {
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
            ]
          }
        ]
      : []
  const silentInfluencedWiring: Wiring = {
    checks: [throwProbeNamedCheck, silentProbeNamedCheck],
    derive: (signals) =>
      pipe(
        signalOf(signals)(silentProbeNamedCheck.name),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray),
        Effect.map(silentInfluencedAdvice),
        Effect.map(Stream.fromIterable),
        Stream.unwrap
      )
  }
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromWiring(silentInfluencedWiring)(workspace)
  )
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
  const blocks = await collectStream(report(workspace))

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
  const error = thrownError(() =>
    makeWiring(
      testWiring([namedNoOpCheck("same-check"), namedNoOpCheck("same-check")])
    )
  )

  assert.match(error.message, /Duplicate check names: same-check/)
})

test("makeWiring rejects duplicate silent check names and reports the collisions", () => {
  const error = thrownError(() =>
    makeWiring(
      testWiring([silentNoOpCheck("same-check"), silentNoOpCheck("same-check")])
    )
  )

  assert.match(error.message, /Duplicate check names: same-check/)
})

test("makeWiring rejects duplicate names across reported and silent checks", () => {
  const error = thrownError(() =>
    makeWiring(
      testWiring([
        namedNoOpCheck("shared-name"),
        silentNoOpCheck("shared-name")
      ])
    )
  )

  assert.match(error.message, /Duplicate check names: shared-name/)
})
