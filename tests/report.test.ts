import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Array, Effect, pipe } from "effect"
import * as ts from "typescript"
import { Detection } from "@better-typescript/core/engine/location/detectionData"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { type Advice } from "@better-typescript/core/engine/derive/advice"
import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { type WorkspacePolicy } from "@better-typescript/core/engine/policy/workspacePolicyClass"
import type { Wiring } from "@better-typescript/core/engine/wiring/wiringClass"
import type { WiringConfig } from "@better-typescript/core/engine/wiring/wiringConfig"
import type { WiringPolicy } from "@better-typescript/core/engine/wiring/wiringPolicy"
import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"
import { makeSilentPolicy } from "@better-typescript/core/engine/policy/makeSilentPolicy"
import { makeWorkspacePolicy } from "@better-typescript/core/engine/policy/makeWorkspacePolicy"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { signalOf } from "@better-typescript/core/engine/signal/signal"
import {
  filterFallbackAdviceForUncoveredFiles,
  withFallbackAdvice
} from "@better-typescript/core/engine/fileLevelAdvice"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example/examplesFromDefinition"
import { DirectoryRefactorExamples } from "@better-typescript/core/engine/example/directoryRefactorExamples"
import { ExampleSnippet } from "@better-typescript/core/engine/example/exampleSnippet"
import { InlineRefactorExamples } from "@better-typescript/core/engine/example/inlineRefactorExamples"
import { defaultConfig, noValueAliases } from "@better-typescript/guidance/preset/defaultWiring"
import { astNodesIn } from "@better-typescript/matchers/sources/astNodesIn"
import { foldAst } from "@better-typescript/matchers/sources/foldAst"
import { isProjectSourceFile } from "@better-typescript/matchers/sources/isProjectSourceFile"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { reportEvents } from "@better-typescript/core/engine/reportPipeline"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { runPolicyOnProject } from "@better-typescript/core/project/loadProject/runPolicyOnProject"
import { Match } from "@better-typescript/matchers/matcher/match"
import { PositionTarget } from "@better-typescript/matchers/matcher/positionTarget"
import { makeNodeMatch } from "@better-typescript/matchers/matcher/makeNodeMatch"
import { makeDirectoryMatcher } from "@better-typescript/matchers/matcher/makeDirectoryMatcher"
import { makeMatcherFromSubscriptions } from "@better-typescript/matchers/matcher/makeMatcherFromSubscriptions"
import { nodeMatcher } from "@better-typescript/matchers/matcher/nodeMatcher"
import { makeFileMatch } from "@better-typescript/matchers/builtins/exportSurface"
import type { LoadedProject } from "@better-typescript/core/project/loadProject/loadedProject"
import type { LoadedWorkspace } from "@better-typescript/core/project/loadProject"
import { advice } from "./reportAdvice.js"
import { collectAstSignatures } from "./reportCollectAstSignatures.js"
import { configFor } from "./reportConfigFor.js"
import { detectionRecord } from "./reportDetectionRecord.js"
import { emptyGuidance } from "./reportEmptyGuidance.js"
import { emptyMatcher } from "./reportEmptyMatcher.js"
import { expectedThrowProbeElements } from "./reportExpectedThrowProbeElements.js"
import { fileVisitPolicy } from "./reportFileVisitPolicy.js"
import { firstLines } from "./reportFirstLines.js"
import { fixedDetectionPolicy } from "./reportFixedDetectionPolicy.js"
import { loadFixtureProject } from "./reportLoadFixtureProject.js"
import { loadFixtureWorkspace } from "./reportLoadFixtureWorkspace.js"
import { namedNoOpPolicy } from "./reportNamedNoOpPolicy.js"
import { noThrowFixturePath } from "./reportNoThrowFixturePath.js"
import { probeExamples } from "./reportProbeExamples.js"
import { probeHint } from "./reportProbeHint.js"
import { probeMessage } from "./reportProbeMessage.js"
import { reportFromTestWiring } from "./reportFromTestWiring.js"
import { silentNoOpPolicy } from "./reportSilentNoOpPolicy.js"
import { silentProbeNamedPolicy } from "./reportSilentProbeNamedPolicy.js"
import { fixturePath } from "./reportTestFixturePath.js"
import { testWiring } from "./reportTestWiring.js"
import { reportTexts } from "./reportTexts.js"
import { thrownMessage } from "./reportThrownMessage.js"
import { throwProbePolicy } from "./reportThrowProbePolicy.js"
import { unit } from "./reportUnit.js"

test("report preserves the no-value-aliases public identity", async () => {
  const workspace = await loadFixtureWorkspace("no-value-aliases")
  const blocks = await Effect.runPromise(
    reportFromTestWiring(testWiring([noValueAliases]))(workspace)
  )
  const block = blocks[0]

  assert.equal(blocks.length, 1)
  assert.ok(block)
  assert.match(block, /^no-value-aliases/)
  assert.match(block, /Do not declare aliases for existing values\./)
  assert.match(block, /Use the referenced value directly\./)
  assert.match(block, /src\/cases\.ts:4:7/)
  assert.doesNotMatch(block, /no-export-aliases/)
})

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
  const blocks = await Effect.runPromise(reportTexts(config)(workspace))

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
  const blocks = await Effect.runPromise(reportTexts(config)(workspace))

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
  const blocks = await Effect.runPromise(reportTexts(config)(workspace))

  assert.deepEqual(firstLines(blocks), [
    "packages/alpha [directory] — alpha detections 1",
    "packages/beta [directory] — beta detections 1",
    "alpha derived input",
    "beta derived input"
  ])
})

test("workspace directory policies use scoped canonical paths and deduplicate projects", async () => {
  const directoryPolicy: WorkspacePolicy = makeWorkspacePolicy({
    name: "scoped source directory",
    matcher: makeDirectoryMatcher((target) =>
      Array.of(new Match({ target, fact: target.sourceFiles.length }))
    ),
    guidance: () => (match) =>
      makeFindings(
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
  const blocks = await Effect.runPromise(reportTexts(config)(duplicatedWorkspace))

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
  const blocks = await Effect.runPromise(
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
  const mustNotRun = makePolicy({
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
  const blocks = await Effect.runPromise(reportTexts(config)(workspace))

  assert.deepEqual(blocks, [])
})

test("reportEvents does not load examples for a policy without detections", async () => {
  const missingExamples = DirectoryRefactorExamples.make({
    root: fixturePath("missing-report-examples")
  })
  const noOutputPolicy = makePolicy({
    name: "no output",
    matcher: emptyMatcher,
    guidance: emptyGuidance,
    examples: missingExamples
  })
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await Effect.runPromise(
    reportFromTestWiring(testWiring([noOutputPolicy]))(workspace)
  )

  assert.deepEqual(blocks, [])
})

test("glob wiring drops detections outside its matched files", async () => {
  const outsideDetection = Detection.make({
    location: Location.make({ path: "src/allowed.ts", line: 1, column: 1 }),
    message: "outside configured glob",
    hint: "drop this detection"
  })
  const policy = fixedDetectionPolicy("outside detection", [outsideDetection])
  const config = configFor(testWiring([policy]), ["src/cases.ts"])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await Effect.runPromise(reportTexts(config)(workspace))

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
  const blocks = await Effect.runPromise(
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
  const doubleDetectionPolicy = makePolicy({
    name: "two messages on one node",
    matcher: nodeMatcher([ts.SyntaxKind.ThrowStatement])(ts.isThrowStatement)(() => (node) => [
      makeNodeMatch(node, "first"),
      makeNodeMatch(node, "second")
    ]),
    guidance: () => (match) => {
      const which = match.fact as string
      return which === "first"
        ? makeFindings(
            match.target,
            "first interpretation",
            "handle the first interpretation",
            unit
          )
        : makeFindings(
            match.target,
            "second interpretation",
            "handle the second interpretation",
            unit
          )
    },
    examples: probeExamples
  })
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await Effect.runPromise(
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
    location: Location.make({ path: "src/cases.ts", line: 4, column: 3 }),
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
  const blocks = await Effect.runPromise(
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
      location: Location.make({ path: "src/cases.ts", line: 4, column: 3 }),
      message: probeMessage,
      hint: probeHint
    }),
    Detection.make({
      location: Location.make({ path: "src/cases.ts", line: 9, column: 5 }),
      message: probeMessage,
      hint: probeHint
    })
  ])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await Effect.runPromise(
    reportFromTestWiring(testWiring([groupedPolicy]))(workspace)
  )

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
      location: Location.make({ path: "src/cases.ts", line: 4, column: 3 }),
      message: "throw statement",
      hint: "yield typed errors instead of throwing"
    }),
    Detection.make({
      location: Location.make({ path: "src/cases.ts", line: 9, column: 5 }),
      message: "throw statement",
      hint: "yield typed errors instead of throwing"
    }),
    Detection.make({
      location: Location.make({ path: "src/cases.ts", line: 19, column: 5 }),
      message: "throw expression",
      hint: "yield typed errors instead of throwing"
    }),
    Detection.make({
      location: Location.make({ path: "src/cases.ts", line: 26, column: 3 }),
      message: "throw statement",
      hint: "return error values instead"
    })
  ])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await Effect.runPromise(reportFromTestWiring(testWiring([splitPolicy]))(workspace))

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
      location: Location.make({ path: "src/cases.ts", line: 4, column: 3 }),
      message: probeMessage,
      hint: probeHint
    })
  ])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await Effect.runPromise(
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
      location: Location.make({ path: "src/cases.ts", line: 4, column: 3 }),
      message: probeMessage,
      hint: probeHint
    })
  ])
  const workspace = await loadFixtureWorkspace("no-throw")
  const blocks = await Effect.runPromise(
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
  const blocks = await Effect.runPromise(reportTexts(defaultConfig)(workspace))
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
            location: Location.make({ path: "project", line: 1, column: 1 }),
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
  const blocks = await Effect.runPromise(reportFromTestWiring(silentInfluencedWiring)(workspace))
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
  const blocks = await Effect.runPromise(reportTexts(defaultConfig)(workspace))

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
    Effect.runPromise(
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
