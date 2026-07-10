import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Chunk, Effect, Stream, pipe } from "effect"
import * as ts from "typescript"
import {
  Detection,
  fileCheck,
  Location,
  locateNode,
  makeWiring,
  namedRuleCheck,
  nodeCheck,
  reportFromWiring,
  runRuleCheckOnProject,
  withFallbackAdvice,
  type AdviceElement,
  type NamedRuleCheck,
  type ReportWiring,
  type RuleCheck
} from "../src/kernel.js"
import { report } from "../src/preset.js"
import { astNodes } from "../src/detectors/sources.js"
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

const throwProbeCheck: RuleCheck = nodeCheck([ts.SyntaxKind.ThrowStatement])(
  ts.isThrowStatement
)((context) => (node) => [
  new Detection({
    location: locateNode(context)(node),
    message: probeMessage,
    hint: probeHint
  })
])

const throwProbeRule: NamedRuleCheck = {
  name: "probe throw statements",
  check: throwProbeCheck
}

const helperProbeRule: NamedRuleCheck = {
  name: "helper-only probe",
  check: fileCheck(() => [
    new Detection({
      location: location("src/helper-observation.ts", 1, 1),
      message: "helper observation",
      hint: "helper observations only feed advice"
    })
  ])
}

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
  level: AdviceElement["level"],
  filePath: string,
  title: string,
  remediation = `fix ${title}`
): AdviceElement => ({
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

const noAdvice: ReportWiring["advice"] = () => Stream.empty

const fixedRuleCheck =
  (elements: ReadonlyArray<Detection>): RuleCheck =>
  () =>
    Stream.fromIterable(elements)

const reportWiring = (
  rules: ReadonlyArray<NamedRuleCheck>,
  advice: ReportWiring["advice"] = noAdvice,
  helpers: ReadonlyArray<NamedRuleCheck> = []
): ReportWiring => ({ rules, helpers, advice })

const noOpCheck: RuleCheck = () => Stream.empty

const namedNoOpCheck = (name: string): NamedRuleCheck =>
  namedRuleCheck(name, noOpCheck)

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

test("runRuleCheckOnProject applies probe subscriptions to matching fixture nodes", async () => {
  const project = await loadFixtureProject("no-throw")
  const elements = await Effect.runPromise(
    runRuleCheckOnProject(throwProbeCheck)(project)
  )

  assert.deepEqual(
    elements.map(detectionRecord),
    expectedThrowProbeElements,
    "expected the probe rule to report every throw statement with source locations in fixture order"
  )
})

test("reportFromWiring collapses duplicate workspace detections by rule and location", async () => {
  const workspace = await Effect.runPromise(loadProject(noThrowFixturePath))
  const [project] = workspace.projects

  assert.ok(project, "expected no-throw fixture to load one TypeScript project")

  const duplicatedWorkspace: LoadedWorkspace = {
    ...workspace,
    projects: [project, project]
  }
  const blocks = await collectStream(
    reportFromWiring(reportWiring([throwProbeRule]))(duplicatedWorkspace)
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
  const doubleDetectionCheck: RuleCheck = nodeCheck([
    ts.SyntaxKind.ThrowStatement
  ])(ts.isThrowStatement)((context) => (node) => {
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
      reportWiring([namedRuleCheck("two messages on one node", doubleDetectionCheck)])
    )(workspace)
  )

  assert.equal(blocks.length, 2)
  assert.deepEqual(blocks.map((block) => block.split("\n")[1]), [
    "  first interpretation",
    "  second interpretation"
  ])
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
    remediation: "split the module before changing individual rules",
    evidence: [
      { measure: "signals", count: 12 },
      { measure: "no-throw", count: 4 }
    ]
  }
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromWiring(reportWiring([], () => Stream.fromIterable([fixedAdvice])))(
      workspace
    )
  )

  assert.deepEqual(blocks, [
    [
      "src/cases.ts [file] — high signal density",
      "  fix: split the module before changing individual rules",
      "  evidence: signals: 12",
      "  evidence: no-throw: 4"
    ].join("\n")
  ])
})

test("reportFromWiring groups locations under the rule prose name, message, and hint", async () => {
  const groupedRule = namedRuleCheck(
    "probe throw statements",
    fixedRuleCheck([
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
    reportFromWiring(reportWiring([groupedRule]))(workspace)
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

test("reportFromWiring splits one rule into distinct message and hint groups", async () => {
  const splitRule = namedRuleCheck(
    "probe throw statements",
    fixedRuleCheck([
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
    reportFromWiring(reportWiring([splitRule]))(workspace)
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

test("reportFromWiring orders advice before rule blocks and sorts advice by level then path", async () => {
  const fixedAdvice = Stream.fromIterable([
    advice("project", "ignored.ts", "project advice"),
    advice("file", "src/z.ts", "file z advice"),
    advice("directory", "src", "directory advice"),
    advice("file", "src/a.ts", "file a advice")
  ])
  const groupedRule = namedRuleCheck(
    "probe throw statements",
    fixedRuleCheck([
      new Detection({
        location: location("src/cases.ts", 4, 3),
        message: probeMessage,
        hint: probeHint
      })
    ])
  )
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromWiring(reportWiring([groupedRule], () => fixedAdvice))(workspace)
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

test("reportFromWiring preserves asynchronously emitted advice and rule streams", async () => {
  const delayedRule = namedRuleCheck(
    "probe throw statements",
    () =>
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
      reportWiring([delayedRule], () =>
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

test("report stream emits rule blocks and omits helper-only checks", async () => {
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(report(workspace))
  const headers = firstLines(blocks)

  assert.ok(
    headers.includes("no-throw"),
    "expected the no-throw rule to emit a report block"
  )
  assert.equal(
    headers.includes("prefer-curried-data-last-functions"),
    false,
    "expected helper-only checks to stay out of report rule blocks"
  )
})

test("reportFromWiring lets helper checks influence advice without rendering helper rule blocks", async () => {
  const helperInfluencedAdvice = (
    helperElements: ReadonlyArray<Detection>
  ): ReadonlyArray<AdviceElement> =>
    helperElements.length > 0
      ? [
          {
            location: location("project", 1, 1),
            level: "project",
            title: "helper-influenced advice",
            remediation: "act on helper-derived evidence",
            evidence: [
              {
                measure: helperProbeRule.name,
                count: helperElements.length
              }
            ]
          }
        ]
      : []
  const helperInfluencedWiring: ReportWiring = {
    rules: [throwProbeRule],
    helpers: [helperProbeRule],
    advice: (_rules, helpers) => {
      const helperElements =
        helpers.find((signals) => signals.name === helperProbeRule.name)
          ?.elements ?? Stream.empty

      return pipe(
        Stream.runCollect(helperElements),
        Effect.map(Chunk.toReadonlyArray),
        Effect.map(helperInfluencedAdvice),
        Effect.map(Stream.fromIterable),
        Stream.unwrap
      )
    }
  }
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectStream(
    reportFromWiring(helperInfluencedWiring)(workspace)
  )
  const headers = firstLines(blocks)

  assert.ok(
    headers.includes("project [project] — helper-influenced advice"),
    "expected advice to consume helper check output"
  )
  assert.ok(
    headers.includes(throwProbeRule.name),
    "expected configured reported rules to render rule blocks"
  )
  assert.equal(
    headers.includes(helperProbeRule.name),
    false,
    "expected helper checks to feed advice without rendering as rule blocks"
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
  const collectInvocation = (): Promise<ReadonlyArray<AdviceElement>> =>
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

test("makeWiring rejects duplicate rule names and reports the collisions", () => {
  const error = thrownError(() =>
    makeWiring(
      reportWiring([namedNoOpCheck("same-rule"), namedNoOpCheck("same-rule")])
    )
  )

  assert.match(error.message, /rules: same-rule/)
})

test("makeWiring rejects duplicate helper names and reports the collisions", () => {
  const error = thrownError(() =>
    makeWiring(
      reportWiring(
        [],
        noAdvice,
        [namedNoOpCheck("same-helper"), namedNoOpCheck("same-helper")]
      )
    )
  )

  assert.match(error.message, /helpers: same-helper/)
})

test("makeWiring allows a rule and helper to share a name", () => {
  const wiring = reportWiring(
    [namedNoOpCheck("shared-name")],
    noAdvice,
    [namedNoOpCheck("shared-name")]
  )

  assert.equal(makeWiring(wiring), wiring)
})
