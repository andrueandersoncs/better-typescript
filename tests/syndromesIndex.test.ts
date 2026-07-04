import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"
import { Schema } from "effect"
import { detectors } from "../src/detectors/index.js"
import { isFindingRule, rules } from "../src/rules/index.js"
import { syndromeStratum } from "../src/runner/interpretMatches.js"
import { syndromeRegistry, syndromes } from "../src/syndromes/index.js"
import {
  Syndrome,
  hasMentionCycle,
  syndromeMentions
} from "../src/syndromes/types.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const syndromesDirectory = path.join(testDirectory, "..", "src", "syndromes")

const isSyndrome = Schema.is(Syndrome)

interface DiscoveredSyndrome {
  readonly fileName: string
  readonly exportName: string
  readonly syndromeId: string
}

const moduleFileNames = fs
  .readdirSync(syndromesDirectory)
  .filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
  .sort()

const discoveredSyndromeEntry =
  (fileName: string) =>
  ([exportName, value]: readonly [
    string,
    unknown
  ]): ReadonlyArray<DiscoveredSyndrome> =>
    isSyndrome(value) ? [{ fileName, exportName, syndromeId: value.id }] : []

const discoverSyndromes = async (
  fileName: string
): Promise<ReadonlyArray<DiscoveredSyndrome>> => {
  const modulePath = pathToFileURL(path.join(syndromesDirectory, fileName)).href
  // Module specifiers come from a directory listing, so a static import
  // cannot express them: this test exists to catch files the static
  // imports in src/syndromes/index.ts forgot.
  const module: Record<string, unknown> = await import(modulePath)

  return Object.entries(module).flatMap(discoveredSyndromeEntry(fileName))
}

const registryPlacements: ReadonlyArray<{
  readonly level: string
  readonly syndromes: ReadonlyArray<Syndrome>
}> = [
  { level: "file", syndromes: syndromeRegistry.fileSyndromes },
  { level: "file", syndromes: syndromeRegistry.fileFallbacks },
  { level: "directory", syndromes: syndromeRegistry.directorySyndromes },
  { level: "project", syndromes: syndromeRegistry.projectSyndromes }
]

const registeredSyndromes = registryPlacements.flatMap(
  (placement) => placement.syndromes
)

test("every syndrome module in src/syndromes is registered in the syndrome registry", async () => {
  const discovered = (
    await Promise.all(moduleFileNames.map(discoverSyndromes))
  ).flat()

  assert.ok(
    discovered.length > 0,
    "expected to discover syndrome modules in src/syndromes"
  )

  const registeredIds = registeredSyndromes.map((syndrome) => syndrome.id)
  const registeredIdSet = new Set(registeredIds)

  const unregistered = discovered
    .filter((entry) => !registeredIdSet.has(entry.syndromeId))
    .map(
      (entry) =>
        `${entry.fileName} exports ${entry.exportName} (${entry.syndromeId})`
    )

  assert.deepEqual(
    unregistered,
    [],
    "expected every syndrome exported from src/syndromes to appear in the syndrome registry"
  )

  const discoveredIdSet = new Set(discovered.map((entry) => entry.syndromeId))
  const phantom = registeredIds.filter(
    (syndromeId) => !discoveredIdSet.has(syndromeId)
  )

  assert.deepEqual(
    phantom,
    [],
    "expected every registered syndrome id to come from a module in src/syndromes"
  )

  const duplicateIds = registeredIds.filter(
    (syndromeId, index) => registeredIds.indexOf(syndromeId) !== index
  )

  assert.deepEqual(
    duplicateIds,
    [],
    "expected the registry to register every syndrome exactly once"
  )

  assert.equal(
    registeredSyndromes.length,
    discovered.length,
    "expected the registry to have one entry per discovered syndrome export"
  )
})

test("registry placement agrees with each syndrome's declared level", () => {
  const misplaced = registryPlacements.flatMap((placement) =>
    placement.syndromes
      .filter((syndrome) => syndrome.level !== placement.level)
      .map((syndrome) => `${syndrome.id} (${syndrome.level})`)
  )

  assert.deepEqual(
    misplaced,
    [],
    "expected every syndrome to be registered at its declared level"
  )
})

test("every signal rule is consumed by at least one syndrome", () => {
  const consumed = new Set(registeredSyndromes.flatMap(syndromeMentions))
  const orphanSignals = rules
    .filter((rule) => !isFindingRule(rule))
    .map((rule) => rule.id)
    .filter((ruleId) => !consumed.has(ruleId))

  assert.deepEqual(
    orphanSignals,
    [],
    "expected every signal rule to feed at least one syndrome's conditions"
  )
})

test("every syndrome's conditions reference only registered detector ids", () => {
  const knownDetectorIds = new Set(detectors.map((detector) => detector.id))
  const unknown = registeredSyndromes
    .flatMap(syndromeMentions)
    .filter((detectorId) => !knownDetectorIds.has(detectorId))

  assert.deepEqual(
    unknown,
    [],
    "expected syndrome conditions to reference real detectors"
  )
})

test("the mentions graph is acyclic", () => {
  const cyclic = syndromes
    .filter(hasMentionCycle(syndromes))
    .map((syndrome) => syndrome.id)

  assert.deepEqual(
    cyclic,
    [],
    "expected no syndrome to reach itself through its mention edges"
  )
})

test("strata are computed from mentions and the advice-over-advice detector sits deeper", () => {
  const stratumOf = syndromeStratum(syndromes)
  const shallow = syndromes
    .filter((syndrome) => stratumOf(syndrome) < 1)
    .map((syndrome) => syndrome.id)

  assert.deepEqual(
    shallow,
    [],
    "expected every syndrome to evaluate above the rules"
  )

  const systemic = syndromes.filter(
    (syndrome) => syndrome.id === "systemic-hotspots"
  )
  assert.equal(
    stratumOf(systemic[0]),
    2,
    "expected systemic-hotspots to sit one stratum above the advice it consumes"
  )
})

test("gating stays with finding-role node rules only", () => {
  const findingDetectors = detectors.filter(
    (detector) => detector.role === "finding"
  )
  const ruleIds = new Set(rules.map((rule) => rule.id))
  const nonRuleGating = findingDetectors
    .filter((detector) => !ruleIds.has(detector.id))
    .map((detector) => detector.id)

  assert.deepEqual(
    nonRuleGating,
    [],
    "expected only node rules to carry the exit-code-gating finding role"
  )

  const nonAdviceSyndromes = syndromes
    .filter((syndrome) => syndrome.role !== "advice")
    .map((syndrome) => syndrome.id)

  assert.deepEqual(
    nonAdviceSyndromes,
    [],
    "expected every summary detector to carry the advice role"
  )
})
