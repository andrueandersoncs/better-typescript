import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Array, Effect, pipe } from "effect"
import * as ts from "typescript"
import { Detection, Location } from "@better-typescript/core/engine/location/data"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import type { Policy, WorkspacePolicy } from "@better-typescript/core/engine/policy/data"
import type { Wiring, WiringConfig, WiringPolicy } from "@better-typescript/core/engine/wiring/data"
import { defineConfig, makeWiring } from "@better-typescript/core/engine/wiring"
import {
  definePolicy,
  defineSilentPolicy,
  defineWorkspacePolicy,
  oneFinding
} from "@better-typescript/core/engine/policy"
import { signalOf } from "@better-typescript/core/engine/signal"
import {
  filterFallbackAdviceForUncoveredFiles,
  withFallbackAdvice
} from "@better-typescript/core/engine/report"
import {
  makeDirectoryRefactorExamples,
  emptyRefactorExampleSource
} from "@better-typescript/core/engine/example"
import {
  makeExampleSnippet,
  makeInlineRefactorExamples,
  makeRefactorExample
} from "./exampleHelpers.js"
import { defaultConfig } from "@better-typescript/guidance/preset/defaultWiring"
import {
  astNodesIn,
  makeContext,
  foldAst,
  isProjectSourceFile
} from "@better-typescript/matchers/sources"
import { reportEvents } from "@better-typescript/core/engine/watch"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import { loadProject, runPolicyOnProject } from "@better-typescript/core/project/loadProject"
import {
  directoryMatcher,
  fileMatcher,
  makeMatcherFromSubscriptions,
  nodeMatcher
} from "@better-typescript/matchers/matcher"
import {
  directoryMatch,
  fileMatch,
  nodeMatch,
  positionTarget
} from "@better-typescript/matchers/matcher/data"
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
const unit = null

const loadFixtureWorkspace = (name: string): Promise<LoadedWorkspace> =>
  Effect.runPromise(loadProject(fixturePath(name)))

const loadFixtureProject = async (name: string): Promise<LoadedProject> => {
  const workspace = await loadFixtureWorkspace(name)
  const [project] = workspace.projects

  assert.ok(project, `expected ${name} fixture to load one TypeScript project`)

  return project
}

const collectEffect = <A, E>(
  effect: Effect.Effect<ReadonlyArray<A>, E>
): Promise<ReadonlyArray<A>> => Effect.runPromise(effect)

const workspaceUpdateOf = (workspace: LoadedWorkspace): WorkspaceUpdate =>
  new WorkspaceUpdate({
    rootPath: workspace.rootPath,
    contexts: workspace.projects.map((project) => makeContext(project.rootPath)(project.program))
  })

const reportTexts = (config: WiringConfig) => (workspace: LoadedWorkspace) =>
  pipe(
    reportEvents(config)(workspaceUpdateOf(workspace)),
    Effect.map((events) => events.flatMap((event) => (event._tag === "signal" ? [event.text] : [])))
  )

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

const throwProbeMatcher = nodeMatcher([ts.SyntaxKind.ThrowStatement])(ts.isThrowStatement)(
  () => (node) => [nodeMatch(node, unit)]
)

const throwProbePolicy: Policy = definePolicy({
  name: "probe throw statements",
  matcher: throwProbeMatcher,
  guidance: () => (match) => oneFinding(match.target, probeMessage, probeHint, unit),
  examples: probeExamples
})

const syntheticSourceFile = (context: { readonly projectRoot: string }, relativePath: string) =>
  ts.createSourceFile(
    path.join(context.projectRoot, relativePath),
    "",
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  )

const silentProbeNamedPolicy: Policy = defineSilentPolicy({
  name: "silent-only probe",
  matcher: fileMatcher((context) => {
    const projectFiles = context.program
      .getSourceFiles()
      .filter((file) => !file.isDeclarationFile && !file.fileName.includes("node_modules"))
    return projectFiles[0] === context.sourceFile ? [fileMatch(context.sourceFile, unit)] : []
  }),
  guidance: (context) => () =>
    oneFinding(
      positionTarget(syntheticSourceFile(context, "src/silent-observation.ts"), 1, 1),
      "silent observation",
      "silent observations only feed advice",
      unit
    ),
  examples: emptyRefactorExampleSource
})

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

const noDerive: Wiring["derive"] = () => []

const fixedDetectionPolicy = (
  name: string,
  elements: ReadonlyArray<Detection>,
  examples = probeExamples,
  reported = true
): Policy => {
  const matcher = fileMatcher((context) => {
    if (elements.length === 0) return []
    const projectFiles = context.program
      .getSourceFiles()
      .filter((file) => !file.isDeclarationFile && !file.fileName.includes("node_modules"))
    return projectFiles[0] === context.sourceFile
      ? Array.of(fileMatch(context.sourceFile, elements))
      : []
  })
  const guidance =
    (context: { readonly projectRoot: string }) =>
    (match: { readonly fact: ReadonlyArray<Detection> }) =>
      match.fact.flatMap((element) =>
        oneFinding(
          positionTarget(
            syntheticSourceFile(context, element.location.path),
            element.location.line ?? 1,
            element.location.column ?? 1
          ),
          element.message,
          element.hint,
          element.data
        )
      )
  return reported
    ? definePolicy({ name, matcher, guidance: guidance as any, examples })
    : defineSilentPolicy({ name, matcher, guidance: guidance as any, examples })
}

const fileVisitPolicy = (name: string, message: string, hint: string): Policy =>
  definePolicy({
    name,
    matcher: fileMatcher((context) => [fileMatch(context.sourceFile, unit)]),
    guidance: () => (match) => oneFinding(match.target, message, hint, unit),
    examples: probeExamples
  })

const testWiring = (
  policies: ReadonlyArray<WiringPolicy>,
  derive: Wiring["derive"] = noDerive
): Wiring => makeWiring({ policies, derive })

const configFor = (wiring: Wiring, files: WiringConfig[number]["files"] = ["**/*"]): WiringConfig =>
  defineConfig([{ files, wiring }])

const reportFromTestWiring = (wiring: Wiring) => reportTexts(configFor(wiring))

const emptyMatcher = makeMatcherFromSubscriptions(() => [])
const emptyGuidance = () => () => []

const namedNoOpPolicy = (name: string): Policy =>
  definePolicy({
    name,
    matcher: emptyMatcher,
    guidance: emptyGuidance,
    examples: probeExamples
  })

const silentNoOpPolicy = (name: string): Policy =>
  defineSilentPolicy({
    name,
    matcher: emptyMatcher,
    guidance: emptyGuidance,
    examples: emptyRefactorExampleSource
  })

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
  const rootExpression = Array.makeBy(depth, () => undefined).reduce<ts.Expression>(
    (expression) => ts.factory.createParenthesizedExpression(expression),
    ts.factory.createIdentifier("value")
  )
  const nodeCount = foldAst((count: number) => count + 1)(rootExpression)(0)

  assert.equal(nodeCount, depth + 1)
})

test("runPolicyOnProject applies probe subscriptions to matching fixture nodes", async () => {
  const project = await loadFixtureProject("no-throw")
  const elements = await Effect.runPromise(runPolicyOnProject(Array.of(throwProbePolicy))(project))

  assert.deepEqual(
    elements.map(detectionRecord),
    expectedThrowProbeElements,
    "expected the probe policy to report every throw statement with source locations in fixture order"
  )
})

test("glob config runs every wiring whose file patterns match", async () => {
  const alphaWiring = testWiring([
    fileVisitPolicy(
      "alpha files",
      "visited glob-matched file",
      "run each wiring only on matching files"
    )
  ])
  const betaWiring = testWiring([
    fileVisitPolicy(
      "beta file",
      "visited glob-matched file",
      "run each wiring only on matching files"
    )
  ])
  const allPackagesWiring = testWiring([
    fileVisitPolicy(
      "all package files",
      "visited glob-matched file",
      "run each wiring only on matching files"
    )
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
  const blocks = await collectEffect(reportTexts(config)(workspace))

  assert.deepEqual(firstLines(blocks), ["alpha files", "beta file", "all package files"])
  assert.deepEqual(
    blocks.map((block) => block.split("\n").filter((line) => line.endsWith(":1:1"))),
    [["  src/alpha.ts:1:1"], ["  src/beta.ts:1:1"], ["  src/alpha.ts:1:1", "  src/beta.ts:1:1"]]
  )
})

test("glob config excludes negated patterns from a positive scope", async () => {
  const wiring = testWiring([
    fileVisitPolicy(
      "included package files",
      "visited included glob file",
      "exclude configured paths from a positive scope"
    )
  ])
  const config = defineConfig([
    {
      files: ["packages/**/src/*.ts", "!packages/beta/**"],
      wiring
    }
  ])
  const workspace = await loadFixtureWorkspace("glob-wirings")
  const blocks = await collectEffect(reportTexts(config)(workspace))

  assert.deepEqual(
    blocks.map((block) => block.split("\n").filter((line) => line.endsWith(":1:1"))),
    [["  src/alpha.ts:1:1"]]
  )
})

test("each glob wiring derives from only its matching files", async () => {
  const alphaWiring = testWiring(
    [
      fileVisitPolicy(
        "alpha derived input",
        "derived glob input",
        "derive independently per wiring"
      )
    ],
    (signals) => {
      const count = signals[0]?.detections.length ?? 0

      return [advice("directory", "packages/alpha", `alpha detections ${count}`)]
    }
  )
  const betaWiring = testWiring(
    [
      fileVisitPolicy("beta derived input", "derived glob input", "derive independently per wiring")
    ],
    (signals) => {
      const count = signals[0]?.detections.length ?? 0

      return [advice("directory", "packages/beta", `beta detections ${count}`)]
    }
  )
  const config = defineConfig([
    { files: ["packages/alpha/**/*.ts"], wiring: alphaWiring },
    { files: ["packages/beta/**/*.ts"], wiring: betaWiring }
  ])
  const workspace = await loadFixtureWorkspace("glob-wirings")
  const blocks = await collectEffect(reportTexts(config)(workspace))

  assert.deepEqual(firstLines(blocks), [
    "packages/alpha [directory] — alpha detections 1",
    "packages/beta [directory] — beta detections 1",
    "alpha derived input",
    "beta derived input"
  ])
})

test("workspace directory policies use scoped canonical paths and deduplicate projects", async () => {
  const directoryPolicy: WorkspacePolicy = defineWorkspacePolicy({
    name: "scoped source directory",
    matcher: directoryMatcher((target) =>
      Array.of(directoryMatch(target, target.sourceFiles.length))
    ),
    guidance: () => (match) =>
      oneFinding(
        match.target,
        "scoped source directory",
        "collect canonical workspace-relative paths before directory matching",
        match.fact
      ),
    examples: probeExamples
  })
  const config = defineConfig([
    {
      files: ["packages/alpha/**/*.ts"],
      wiring: testWiring([directoryPolicy])
    }
  ])
  const workspace = await loadFixtureWorkspace("glob-wirings")
  const duplicatedWorkspace: LoadedWorkspace = {
    ...workspace,
    projects: [...workspace.projects, ...workspace.projects]
  }
  const blocks = await collectEffect(reportTexts(config)(duplicatedWorkspace))

  assert.equal(workspace.projects.length, 2)
  assert.equal(blocks.length, 1)
  assert.ok(blocks[0]?.includes("  packages/alpha/src"))
  assert.ok(!blocks[0]?.includes("packages/beta/src"))
})

test("reportEvents analyzes referenced projects sequentially", async () => {
  const policy = fileVisitPolicy(
    "visited source files",
    "visited source file",
    "analyze every referenced project"
  )
  const workspace = await Effect.runPromise(loadProject(fixturePath("glob-wirings")))
  const update = new WorkspaceUpdate({
    rootPath: workspace.rootPath,
    contexts: workspace.projects.map((project) => makeContext(project.rootPath)(project.program))
  })
  const blocks = await collectEffect(
    pipe(
      reportEvents(configFor(testWiring([policy])))(update),
      Effect.map((events) =>
        events.flatMap((event) => (event._tag === "signal" ? [event.text] : []))
      )
    )
  )

  assert.equal(workspace.projects.length, 2)
  assert.deepEqual(
    blocks[0]?.split("\n").filter((line) => line.endsWith(":1:1")),
    ["  src/alpha.ts:1:1", "  src/beta.ts:1:1"]
  )
})

test("an unmatched glob wiring invokes neither policies nor derive", async () => {
  const mustNotRun = definePolicy({
    name: "absent files",
    matcher: makeMatcherFromSubscriptions(() => {
      throw new Error("policy ran")
    }),
    guidance: emptyGuidance,
    examples: probeExamples
  })
  const wiring = testWiring([mustNotRun], () => {
    throw new Error("derive ran")
  })
  const config = configFor(wiring, ["missing/**/*.ts"])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectEffect(reportTexts(config)(workspace))

  assert.deepEqual(blocks, [])
})

test("reportEvents does not load examples for a policy without detections", async () => {
  const missingExamples = makeDirectoryRefactorExamples(fixturePath("missing-report-examples"))
  const noOutputPolicy = definePolicy({
    name: "no output",
    matcher: emptyMatcher,
    guidance: emptyGuidance,
    examples: missingExamples
  })
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectEffect(reportFromTestWiring(testWiring([noOutputPolicy]))(workspace))

  assert.deepEqual(blocks, [])
})

test("glob wiring drops detections outside its matched files", async () => {
  const outsideDetection = Detection.make({
    location: location("src/allowed.ts", 1, 1),
    message: "outside configured glob",
    hint: "drop this detection"
  })
  const policy = fixedDetectionPolicy("outside detection", [outsideDetection])
  const config = configFor(testWiring([policy]), ["src/cases.ts"])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectEffect(reportTexts(config)(workspace))

  assert.deepEqual(blocks, [])
})

test("reportEvents collapses duplicate workspace detections by policy and location", async () => {
  const workspace = await Effect.runPromise(loadProject(noThrowFixturePath))
  const [project] = workspace.projects

  assert.ok(project, "expected no-throw fixture to load one TypeScript project")

  const duplicatedWorkspace: LoadedWorkspace = {
    ...workspace,
    projects: [project, project]
  }
  const blocks = await collectEffect(
    reportFromTestWiring(testWiring([throwProbePolicy]))(duplicatedWorkspace)
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
  const doubleDetectionPolicy = definePolicy({
    name: "two messages on one node",
    matcher: nodeMatcher([ts.SyntaxKind.ThrowStatement])(ts.isThrowStatement)(() => (node) => [
      nodeMatch(node, "first"),
      nodeMatch(node, "second")
    ]),
    guidance: () => (match) => {
      const which = match.fact as string
      return which === "first"
        ? oneFinding(match.target, "first interpretation", "handle the first interpretation", unit)
        : oneFinding(
            match.target,
            "second interpretation",
            "handle the second interpretation",
            unit
          )
    },
    examples: probeExamples
  })
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectEffect(
    reportFromTestWiring(testWiring([doubleDetectionPolicy]))(workspace)
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
  const blocks = await collectEffect(
    reportFromTestWiring(testWiring([], () => [fixedAdvice]))(workspace)
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

test("reportEvents groups locations under the policy prose name, message, and hint", async () => {
  const groupedPolicy = fixedDetectionPolicy("probe throw statements", [
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
  ])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectEffect(reportFromTestWiring(testWiring([groupedPolicy]))(workspace))

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

test("reportEvents splits one policy into distinct message and hint groups", async () => {
  const splitPolicy = fixedDetectionPolicy("probe throw statements", [
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
  ])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectEffect(reportFromTestWiring(testWiring([splitPolicy]))(workspace))

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

test("reportEvents orders advice before policy blocks and sorts advice by level then path", async () => {
  const fixedAdvice = [
    advice("project", "ignored.ts", "project advice"),
    advice("file", "src/z.ts", "file z advice"),
    advice("directory", "src", "directory advice"),
    advice("file", "src/a.ts", "file a advice")
  ]
  const groupedPolicy = fixedDetectionPolicy("probe throw statements", [
    Detection.make({
      location: location("src/cases.ts", 4, 3),
      message: probeMessage,
      hint: probeHint
    })
  ])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectEffect(
    reportFromTestWiring(testWiring([groupedPolicy], () => fixedAdvice))(workspace)
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

test("reportEvents renders multiple advice items in report order", async () => {
  const multiAdvicePolicy = fixedDetectionPolicy("probe throw statements", [
    Detection.make({
      location: location("src/cases.ts", 4, 3),
      message: probeMessage,
      hint: probeHint
    })
  ])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectEffect(
    reportFromTestWiring(
      testWiring([multiAdvicePolicy], () => [
        advice("file", "src/z.ts", "file z advice"),
        advice("file", "src/a.ts", "file a advice")
      ])
    )(workspace)
  )

  assert.deepEqual(firstLines(blocks), [
    "src/a.ts [file] — file a advice",
    "src/z.ts [file] — file z advice",
    "probe throw statements"
  ])
})

test("reportEvents emits policy blocks and omits silent policies", async () => {
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectEffect(reportTexts(defaultConfig)(workspace))
  const headers = firstLines(blocks)

  assert.ok(headers.includes("no-throw"), "expected the no-throw policy to emit a report block")
  assert.equal(
    headers.includes("prefer-curried-data-last-functions"),
    false,
    "expected silent policies to stay out of report blocks"
  )
})

test("reportEvents lets silent policies influence advice without rendering local policy blocks", async () => {
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
                measure: silentProbeNamedPolicy.name,
                count: silentDetections.length
              }
            ],
            examples: probeExamples
          }
        ]
      : []
  const silentInfluencedWiring: Wiring = makeWiring({
    policies: [throwProbePolicy, silentProbeNamedPolicy],
    derive: (signals) => silentInfluencedAdvice(signalOf(signals)(silentProbeNamedPolicy.name))
  })
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectEffect(reportFromTestWiring(silentInfluencedWiring)(workspace))
  const headers = firstLines(blocks)

  assert.ok(
    headers.includes("project [project] — silent-influenced advice"),
    "expected advice to consume silent policy output"
  )
  assert.ok(
    headers.includes(throwProbePolicy.name),
    "expected configured reported policies to render report blocks"
  )
  assert.equal(
    headers.includes(silentProbeNamedPolicy.name),
    false,
    "expected silent policies to feed advice without rendering report blocks"
  )
})

test("report collects the exported report events for a loaded workspace", async () => {
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await collectEffect(reportTexts(defaultConfig)(workspace))

  assert.equal(
    blocks.some((block) => block.length === 0),
    false,
    "expected the exported report events to collect renderable text blocks when they emit"
  )
})

test("withFallbackAdvice emits specific advice before applicable fallback and runs specific effects once per invocation", async () => {
  const specificA = advice("file", "src/a.ts", "specific a")
  const fallbackA = advice("file", "src/a.ts", "density fallback a")
  const fallbackB = advice("file", "src/b.ts", "density fallback b")
  let specificEffects = 0
  const collectInvocation = (): Promise<ReadonlyArray<Advice>> =>
    collectEffect(
      withFallbackAdvice(
        Effect.sync(() => {
          specificEffects += 1

          return [specificA]
        }),
        Effect.succeed([fallbackA, fallbackB])
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
    "expected the specific advice effect to run once for each withFallbackAdvice invocation"
  )

  assert.deepEqual(
    filterFallbackAdviceForUncoveredFiles([specificA])([fallbackA, fallbackB]).map((item) => [
      item.location.path,
      item.title
    ]),
    [["src/b.ts", "density fallback b"]]
  )
})

test("makeWiring rejects duplicate reported policy names and reports the collisions", () => {
  const message = thrownMessage(() =>
    makeWiring(testWiring([namedNoOpPolicy("same-check"), namedNoOpPolicy("same-check")]))
  )

  assert.match(message, /Duplicate policy names: same-check/)
})

test("makeWiring rejects duplicate silent policy names and reports the collisions", () => {
  const message = thrownMessage(() =>
    makeWiring(testWiring([silentNoOpPolicy("same-check"), silentNoOpPolicy("same-check")]))
  )

  assert.match(message, /Duplicate policy names: same-check/)
})

test("makeWiring rejects duplicate names across reported and silent policies", () => {
  const message = thrownMessage(() =>
    makeWiring(testWiring([namedNoOpPolicy("shared-name"), silentNoOpPolicy("shared-name")]))
  )

  assert.match(message, /Duplicate policy names: shared-name/)
})
