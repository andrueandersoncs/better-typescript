import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Array, Effect, Option, pipe } from "effect"
import { makeNamedDetection } from "@better-typescript/core/engine/derive/makeNamedDetection"
import { toPolicies } from "@better-typescript/core/engine/policy/locateTarget"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { semanticModulePlacementAdvice } from "@better-typescript/guidance/architectureExplore/architectureExploreSemanticModulePlacementAdviser"
import { semanticModulePlacementName } from "@better-typescript/guidance/preset/semanticModulePlacementPolicies"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import type { SemanticModuleEntityKey } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEntityKey"
import { cleanManifest } from "./fixtures/semantic-module-placement-clean/manifest.js"
import { mixedManifest } from "./fixtures/semantic-module-placement-mixed/manifest.js"
import { orderingManifest } from "./fixtures/semantic-module-placement-ordering/manifest.js"
import { overlapManifest } from "./fixtures/semantic-module-placement-overlap/manifest.js"
import { placementOnlyAManifest } from "./fixtures/semantic-module-placement-only-a/manifest.js"
import { placementOnlyBManifest } from "./fixtures/semantic-module-placement-only-b/manifest.js"
import { sharedAnchorManifest } from "./fixtures/semantic-module-placement-shared-anchor/manifest.js"
import { splitManifest } from "./fixtures/semantic-module-placement-split/manifest.js"
import { architectureWorkspacePath } from "./semanticModulePlacementArchitectureWorkspacePath.js"
import { assertDetectionContract } from "./semanticModulePlacementAssertDetectionContract.js"
import { assertModuleMembers } from "./semanticModulePlacementAssertModuleMembers.js"
import { assertSliceShape } from "./semanticModulePlacementAssertSliceShape.js"
import { detectionData } from "./semanticModulePlacementDetectionData.js"
import { entityKeysOf } from "./semanticModulePlacementEntityKeysOf.js"
import { includeEverySourceFile } from "./semanticModulePlacementIncludeEverySourceFile.js"
import { keyEquals } from "./semanticModulePlacementKeyEquals.js"
import { mixedOf } from "./semanticModulePlacementMixedOf.js"
import { placementPolicy } from "./semanticModulePlacementPolicy.js"
import { resolvedManifest } from "./semanticModulePlacementResolvedManifest.js"
import { resolveSemanticModuleFixtureManifest } from "./resolveSemanticModuleFixtureManifest.js"
import { runPlacement } from "./semanticModulePlacementRunPlacement.js"
import { snapshotForFixture } from "./semanticModulePlacementSnapshotForFixture.js"
import { splitsOf } from "./semanticModulePlacementSplitsOf.js"

test("clean fixture emits no placement mismatches", async () => {
  const detections = await runPlacement("semantic-module-placement-clean")
  const { resolved } = await resolvedManifest("semantic-module-placement-clean", cleanManifest)

  assert.equal(resolved.modules.length, 2)
  assert.equal(detections.length, 0)
})

test("split fixture emits one split detection at the canonical first member", async () => {
  const detections = await runPlacement("semantic-module-placement-split")
  const { snapshot, resolved } = await resolvedManifest(
    "semantic-module-placement-split",
    splitManifest
  )

  assert.equal(detections.length, 1)
  assert.equal(splitsOf(detections).length, 1)
  assert.equal(mixedOf(detections).length, 0)

  const detection = detections[0]!
  assertDetectionContract(detection)

  const data = detectionData(detection)
  assert.equal(data._tag, "split-semantic-module")

  if (data._tag !== "split-semantic-module") {
    return
  }

  const slice = data.modules[0]!
  assertSliceShape(slice)
  assertModuleMembers(slice, resolved.modules[0]!)

  const firstMember = resolved.modules[0]![0]!
  assert.equal(detection.location.path, firstMember.path)
  assert.equal(slice.entities[0]!.line, detection.location.line)
  assert.equal(slice.entities[0]!.column, detection.location.column)
  assert.deepEqual(slice.physicalModulePaths, ["src/left.ts", "src/right.ts"])
  assert.equal(slice.forestBonds.length, snapshot.modules[0]!.forestBondKeys.length)
})

test("mixed fixture emits one mixed detection at file position 1:1", async () => {
  const detections = await runPlacement("semantic-module-placement-mixed")
  const { resolved } = await resolvedManifest("semantic-module-placement-mixed", mixedManifest)

  assert.equal(detections.length, 1)
  assert.equal(mixedOf(detections).length, 1)
  assert.equal(splitsOf(detections).length, 0)

  const detection = detections[0]!
  assertDetectionContract(detection)
  assert.equal(detection.location.path, "src/mixed.ts")
  assert.equal(detection.location.line, 1)
  assert.equal(detection.location.column, 1)

  const data = detectionData(detection)
  assert.equal(data._tag, "mixed-physical-module")

  if (data._tag !== "mixed-physical-module") {
    return
  }
  assert.equal(data.physicalModulePath, "src/mixed.ts")

  assert.equal(data.modules.length, 2)
  Array.forEach(data.modules, assertSliceShape)
  assertModuleMembers(data.modules[0]!, resolved.modules[0]!)
  assertModuleMembers(data.modules[1]!, resolved.modules[1]!)
})

test("overlap fixture emits independent split and mixed detections", async () => {
  const detections = await runPlacement("semantic-module-placement-overlap")
  const { resolved } = await resolvedManifest("semantic-module-placement-overlap", overlapManifest)

  assert.equal(detections.length, 2)
  assert.equal(splitsOf(detections).length, 1)
  assert.equal(mixedOf(detections).length, 1)
  Array.forEach(detections, assertDetectionContract)

  const split = splitsOf(detections)[0]!
  const mixed = mixedOf(detections)[0]!
  const splitData = detectionData(split)
  const mixedData = detectionData(mixed)
  const splitMembers = resolved.modules[0]!
  const firstMember = splitMembers[0]!

  assert.equal(splitData._tag, "split-semantic-module")
  assert.equal(mixedData._tag, "mixed-physical-module")
  assert.equal(split.location.path, firstMember.path)
  assert.equal(mixed.location.path, "src/home.ts")
  assert.equal(mixed.location.line, 1)
  assert.equal(mixed.location.column, 1)

  if (splitData._tag === "split-semantic-module") {
    assertModuleMembers(splitData.modules[0]!, splitMembers)
    assert.deepEqual(splitData.modules[0]!.physicalModulePaths, [
      "src/home.ts",
      "src/token-away.ts"
    ])
  }

  if (mixedData._tag === "mixed-physical-module") {
    assert.equal(mixedData.physicalModulePath, "src/home.ts")
    assert.equal(mixedData.modules.length, 2)
    assertModuleMembers(mixedData.modules[0]!, resolved.modules[0]!)
    assertModuleMembers(mixedData.modules[1]!, resolved.modules[1]!)
  }
})
test("shared-anchor fixture emits splits at the shared file and mixed for co-located modules", async () => {
  const detections = await runPlacement("semantic-module-placement-shared-anchor")
  const { resolved } = await resolvedManifest(
    "semantic-module-placement-shared-anchor",
    sharedAnchorManifest
  )

  assert.equal(splitsOf(detections).length, 2)
  assert.equal(mixedOf(detections).length, 1)
  assert.equal(detections.length, 3)
  Array.forEach(detections, assertDetectionContract)

  const splitPaths = Array.map(splitsOf(detections), (detection) => detection.location.path)
  assert.deepEqual(splitPaths, ["src/anchor.ts", "src/anchor.ts"])

  const mixed = mixedOf(detections)[0]!
  assert.equal(mixed.location.path, "src/anchor.ts")
  assert.equal(mixed.location.line, 1)
  assert.equal(mixed.location.column, 1)

  const memberSets = pipe(
    splitsOf(detections),
    Array.map((detection) => {
      const data = detectionData(detection)
      assert.equal(data._tag, "split-semantic-module")

      return data._tag === "split-semantic-module"
        ? entityKeysOf(data.modules[0]!)
        : Array.empty<SemanticModuleEntityKey>()
    })
  )

  assert.equal(memberSets.length, 2)
  assert.equal(keyEquals(memberSets[0]![0]!, resolved.modules[0]![0]!), true)
  assert.equal(keyEquals(memberSets[1]![0]!, resolved.modules[1]![0]!), true)
})
test("ordering fixture emits canonically ordered unique projections", async () => {
  const detections = await runPlacement("semantic-module-placement-ordering")
  const { resolved } = await resolvedManifest(
    "semantic-module-placement-ordering",
    orderingManifest
  )

  Array.forEach(detections, assertDetectionContract)

  const splits = splitsOf(detections)
  const mixed = mixedOf(detections)

  assert.equal(splits.length, 2)
  assert.equal(mixed.length, 3)

  const splitFirstMembers = Array.map(splits, (detection) => {
    const data = detectionData(detection)
    assert.equal(data._tag, "split-semantic-module")

    return data._tag === "split-semantic-module" ? data.modules[0]!.entities[0]!.key : undefined
  })

  assert.equal(keyEquals(splitFirstMembers[0]!, resolved.modules[0]![0]!), true)
  assert.equal(keyEquals(splitFirstMembers[1]!, resolved.modules[3]![0]!), true)

  const mixedPaths = Array.map(mixed, (detection) => detection.location.path)
  assert.deepEqual(mixedPaths, ["src/a.ts", "src/b.ts", "src/c.ts"])
  assert.deepEqual(
    Array.map(mixed, (detection) => {
      const data = detectionData(detection)

      return data._tag === "mixed-physical-module" ? data.physicalModulePath : undefined
    }),
    ["src/a.ts", "src/b.ts", "src/c.ts"]
  )

  const encoded = Array.map(detections, (detection) =>
    JSON.stringify({
      path: detection.location.path,
      line: detection.location.line,
      column: detection.location.column,
      tag: detectionData(detection)._tag,
      modules: detectionData(detection).modules.map((slice) => ({
        entities: slice.entities.map((entity) => entity.key),
        physicalModulePaths: slice.physicalModulePaths,
        forestBonds: slice.forestBonds.map((bond) => bond.key)
      }))
    })
  )

  assert.equal(new Set(encoded).size, encoded.length)
})

test("placement-only change alters only placement projections", async () => {
  const together = await runPlacement("semantic-module-placement-only-a")
  const splitAcross = await runPlacement("semantic-module-placement-only-b")
  const togetherSnapshot = await snapshotForFixture("semantic-module-placement-only-a")
  const splitSnapshot = await snapshotForFixture("semantic-module-placement-only-b")
  const togetherResolved = resolveSemanticModuleFixtureManifest(
    placementOnlyAManifest,
    togetherSnapshot
  )
  const splitResolved = resolveSemanticModuleFixtureManifest(placementOnlyBManifest, splitSnapshot)

  assert.equal(togetherResolved.modules.length, splitResolved.modules.length)
  assert.equal(togetherResolved.modules[0]!.length, splitResolved.modules[0]!.length)
  assert.equal(togetherSnapshot.acceptedBonds.length, splitSnapshot.acceptedBonds.length)
  assert.equal(
    togetherSnapshot.modules[0]!.forestBondKeys.length,
    splitSnapshot.modules[0]!.forestBondKeys.length
  )

  assert.equal(together.length, 1)
  assert.equal(mixedOf(together).length, 1)
  assert.equal(splitsOf(together).length, 0)

  assert.equal(splitAcross.length, 2)
  assert.equal(splitsOf(splitAcross).length, 1)
  assert.equal(mixedOf(splitAcross).length, 1)

  Array.forEach(together, assertDetectionContract)
  Array.forEach(splitAcross, assertDetectionContract)

  const splitDetection = splitsOf(splitAcross)[0]!
  const splitData = detectionData(splitDetection)
  assert.equal(splitData._tag, "split-semantic-module")

  if (splitData._tag === "split-semantic-module") {
    assert.deepEqual(splitData.modules[0]!.physicalModulePaths, ["src/left.ts", "src/right.ts"])
    assert.equal(splitData.modules[0]!.entities.length, 2)
  }
})

test("workspace-relative placement paths resolve inside nested projects", async () => {
  const workspace = await Effect.runPromise(loadProject(architectureWorkspacePath))
  const project = pipe(
    workspace.projects,
    Array.findFirst(
      (candidate) => path.relative(workspace.rootPath, candidate.rootPath) === "packages/lib"
    ),
    Option.getOrThrow
  )
  const projectContext = makeContext(project.rootPath)(project.program)
  const context = { ...projectContext, workspaceRoot: workspace.rootPath }
  const detectionsByPolicy = toPolicies(Array.of(placementPolicy))(includeEverySourceFile)(context)
  const detections = detectionsByPolicy[0] ?? Array.empty()
  const mixed = mixedOf(detections)

  assert.equal(mixed.length, 1)
  assert.equal(mixed[0]?.location.path, "src/util.ts")
  const data = detectionData(mixed[0]!)

  assert.equal(data._tag, "mixed-physical-module")

  if (data._tag !== "mixed-physical-module") {
    return
  }

  assert.equal(data.physicalModulePath, "packages/lib/src/util.ts")
  const advice = semanticModulePlacementAdvice(
    Array.map(mixed, makeNamedDetection(semanticModulePlacementName))
  )
  const codeEntitiesHere = pipe(
    advice,
    Array.head,
    Option.map((item) => item.evidence),
    Option.flatMap(Array.findFirst((item) => item.measure === "code-entities-here")),
    Option.map((item) => item.count),
    Option.getOrThrow
  )

  assert.equal(codeEntitiesHere, 3)
  assert.deepEqual(
    data.modules.flatMap((module) =>
      module.entities.map((entity) => ({
        path: entity.key.path,
        line: entity.line,
        column: entity.column
      }))
    ),
    [
      { path: "packages/lib/src/util.ts", line: 1, column: 14 },
      { path: "packages/lib/src/util.ts", line: 3, column: 14 },
      { path: "packages/lib/src/util.ts", line: 6, column: 14 }
    ]
  )
})

test("policy factory is silent and named semantic-module-placement", () => {
  assert.equal(placementPolicy.name, semanticModulePlacementName)
  assert.equal(placementPolicy.reported, false)
})
