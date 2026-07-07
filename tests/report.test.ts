import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Chunk, Effect, Option, Stream, pipe } from "effect"
import * as ts from "typescript"
import { Location, locateNode } from "../src/detectors/location.js"
import {
  adviceText,
  filterFallbackAdvice,
  paginateBlocks,
  renderPage,
  report,
  reportFromWiring,
  reportLeaves,
  ruleLeaf,
  runRuleCheckOnProject,
  runRuleSignals,
  type NamedRuleCheck,
  type ReportWiring,
  type RuleSignals
} from "../src/detectors/report.js"
import { astNodes } from "../src/detectors/sources.js"
import {
  checkFromSubscriptions,
  fileSubscription,
  nodeSubscription,
  Detection,
  type RuleCheck
} from "../src/detectors/rule.js"
import type { AdviceElement } from "../src/detectors/summary.js"
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

const throwProbeCheck: RuleCheck = checkFromSubscriptions(() => [
  nodeSubscription([ts.SyntaxKind.ThrowStatement])((context) => (node) => [
    new Detection({
      location: locateNode(context)(node),
      message: probeMessage,
      hint: probeHint
    })
  ])
])

const throwProbeRule: NamedRuleCheck = {
  name: "probe throw statements",
  check: throwProbeCheck
}

const helperProbeRule: NamedRuleCheck = {
  name: "helper-only probe",
  check: checkFromSubscriptions(() => [
    fileSubscription(() => [
      new Detection({
        location: location("src/helper-observation.ts", 1, 1),
        message: "helper observation",
        hint: "helper observations only feed advice"
      })
    ])
  ])
}

const detectionRecord = (element: Detection) => ({
  path: element.location.path,
  line: element.location.line,
  column: element.location.column,
  message: element.message,
  hint: element.hint
})

const detectionLocationRecord = (element: Detection) => ({
  path: element.location.path,
  line: element.location.line,
  column: element.location.column
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

const ruleSignals = (
  name: string,
  elements: ReadonlyArray<Detection>
): RuleSignals => ({ name, elements: Stream.fromIterable(elements) })

const firstLines = (blocks: ReadonlyArray<string>): ReadonlyArray<string> =>
  blocks.map((block) => block.split("\n")[0])

const delayedSource = <A>(items: ReadonlyArray<A>): Stream.Stream<A, Error> =>
  pipe(
    Stream.fromIterable(items),
    Stream.mapEffect((item) => pipe(Effect.sleep("1 millis"), Effect.as(item)))
  )

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

test("runRuleSignals deduplicates a rule's repeated workspace locations", async () => {
  const workspace = await Effect.runPromise(loadProject(noThrowFixturePath))
  const [project] = workspace.projects

  assert.ok(project, "expected no-throw fixture to load one TypeScript project")

  const duplicatedWorkspace: LoadedWorkspace = {
    ...workspace,
    projects: [project, project]
  }
  const signals = await Effect.runPromise(
    runRuleSignals(duplicatedWorkspace)(throwProbeRule)
  )
  const elements = await collectStream(signals.elements)

  assert.deepEqual(
    elements.map(detectionLocationRecord),
    expectedThrowProbeElements.map(({ path: filePath, line, column }) => ({
      path: filePath,
      line,
      column
    })),
    "expected duplicate project emissions to collapse by path, line, and column"
  )
})

test("adviceText formats the advice header, remediation, and evidence lines", () => {
  const block = adviceText({
    location: location("src/cases.ts", 4, 3),
    level: "file",
    title: "high signal density",
    remediation: "split the module before changing individual rules",
    evidence: [
      { measure: "signals", count: 12 },
      { measure: "no-throw", count: 4 }
    ]
  })

  assert.equal(
    block,
    [
      "src/cases.ts [file] — high signal density",
      "  fix: split the module before changing individual rules",
      "  evidence: signals: 12",
      "  evidence: no-throw: 4"
    ].join("\n")
  )
})

test("ruleLeaf groups locations under the rule prose name, message, and hint", async () => {
  const elements = Stream.fromIterable([
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
  const blocks = await collectStream(
    ruleLeaf("probe throw statements")(elements)
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

test("ruleLeaf splits one rule into distinct message and hint groups", async () => {
  const elements = Stream.fromIterable([
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
  const blocks = await collectStream(
    ruleLeaf("probe throw statements")(elements)
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

test("reportLeaves orders advice before rule blocks and sorts advice by level then path", async () => {
  const adviceStream = Stream.fromIterable([
    advice("project", "ignored.ts", "project advice"),
    advice("file", "src/z.ts", "file z advice"),
    advice("directory", "src", "directory advice"),
    advice("file", "src/a.ts", "file a advice")
  ])
  const blocks = await collectStream(
    reportLeaves(adviceStream, [
      ruleSignals("probe throw statements", [
        new Detection({
          location: location("src/cases.ts", 4, 3),
          message: probeMessage,
          hint: probeHint
        })
      ])
    ])
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

test("reportLeaves preserves asynchronously emitted advice and rule streams", async () => {
  const blocks = await collectStream(
    reportLeaves(
      delayedSource([
        advice("file", "src/z.ts", "file z advice"),
        advice("file", "src/a.ts", "file a advice")
      ]),
      [
        {
          name: "probe throw statements",
          elements: delayedSource([
            new Detection({
              location: location("src/cases.ts", 4, 3),
              message: probeMessage,
              hint: probeHint
            })
          ])
        }
      ]
    )
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

test("renderPage appends the exact pagination footer while more blocks remain", () => {
  const blocks = [
    "signal one",
    "signal two",
    "signal three",
    "signal four",
    "signal five"
  ]

  const firstPage = pipe(blocks, paginateBlocks(0)(Option.some(2)))
  const secondPage = pipe(blocks, paginateBlocks(2)(Option.some(2)))

  assert.equal(
    renderPage(firstPage),
    [
      "signal one",
      "signal two",
      "Showing signals 1-2 of 5. Use --offset 2 to see the next page."
    ].join("\n\n")
  )
  assert.equal(
    renderPage(secondPage),
    [
      "signal three",
      "signal four",
      "Showing signals 3-4 of 5. Use --offset 4 to see the next page."
    ].join("\n\n")
  )
})

test("renderPage omits the pagination footer on final and unlimited pages", () => {
  const blocks = [
    "signal one",
    "signal two",
    "signal three",
    "signal four",
    "signal five"
  ]

  const finalPage = pipe(blocks, paginateBlocks(4)(Option.some(2)))
  const unlimitedPage = pipe(blocks, paginateBlocks(0)(Option.none()))

  assert.equal(renderPage(finalPage), "signal five")
  assert.equal(renderPage(unlimitedPage), blocks.join("\n\n"))
})

test("paginateBlocks reports an empty page past the end without a footer", () => {
  const page = pipe(
    ["signal one", "signal two"],
    paginateBlocks(5)(Option.some(2))
  )

  assert.deepEqual(page.blocks, [])
  assert.equal(page.total, 2)
  assert.equal(page.startIndex, 0)
  assert.equal(page.endIndex, 2)
  assert.equal(renderPage(page), "")
})

test("filterFallbackAdvice suppresses same-path file fallback advice only", async () => {
  const fallbackA = advice("file", "src/a.ts", "density fallback a")
  const fallbackB = advice("file", "src/b.ts", "density fallback b")

  const filtered = await collectStream(
    filterFallbackAdvice(
      Stream.fromIterable([advice("file", "src/a.ts", "specific a")]),
      Stream.fromIterable([fallbackA, fallbackB])
    )
  )

  assert.deepEqual(
    filtered.map((element) => [element.location.path, element.title]),
    [["src/b.ts", "density fallback b"]]
  )
})

test("filterFallbackAdvice keeps fallback advice when no file-level specific advice fired", async () => {
  const fallbackA = advice("file", "src/a.ts", "density fallback a")
  const fallbackB = advice("file", "src/b.ts", "density fallback b")

  const filtered = await collectStream(
    filterFallbackAdvice(
      Stream.empty,
      Stream.fromIterable([fallbackA, fallbackB])
    )
  )

  assert.deepEqual(
    filtered.map((element) => [element.location.path, element.title]),
    [
      ["src/a.ts", "density fallback a"],
      ["src/b.ts", "density fallback b"]
    ]
  )
})

test("filterFallbackAdvice ignores non-file specific advice when suppressing file fallback", async () => {
  const fallbackA = advice("file", "src/a.ts", "density fallback a")

  const filtered = await collectStream(
    filterFallbackAdvice(
      Stream.fromIterable([
        advice("directory", "src/a.ts", "directory specific a"),
        advice("project", "src/a.ts", "project specific a")
      ]),
      Stream.fromIterable([fallbackA])
    )
  )

  assert.deepEqual(
    filtered.map((element) => [element.location.path, element.title]),
    [["src/a.ts", "density fallback a"]]
  )
})
