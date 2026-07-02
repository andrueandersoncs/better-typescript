import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"
import { Schema } from "effect"
import { rules } from "../src/rules/index.js"
import { Rule } from "../src/rules/types.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const rulesDirectory = path.join(testDirectory, "..", "src", "rules")

const isRule = Schema.is(Rule)

interface DiscoveredRule {
  readonly fileName: string
  readonly exportName: string
  readonly rule: Rule
}

const moduleFileNames = fs
  .readdirSync(rulesDirectory)
  .filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
  .sort()

const discoveredRuleEntry =
  (fileName: string) =>
  ([exportName, value]: readonly [string, unknown]): ReadonlyArray<DiscoveredRule> =>
    isRule(value) ? [{ fileName, exportName, rule: value }] : []

const discoverRules = async (
  fileName: string
): Promise<ReadonlyArray<DiscoveredRule>> => {
  const modulePath = pathToFileURL(path.join(rulesDirectory, fileName)).href
  // Module specifiers come from a directory listing, so a static import
  // cannot express them: this test exists to catch files the static
  // imports in src/rules/index.ts forgot.
  const module: Record<string, unknown> = await import(modulePath)

  return Object.entries(module).flatMap(discoveredRuleEntry(fileName))
}

test("every rule module in src/rules is registered in the rules array", async () => {
  const discovered = (await Promise.all(moduleFileNames.map(discoverRules)))
    .flat()
    .sort((left, right) => left.rule.id.localeCompare(right.rule.id))

  assert.ok(
    discovered.length > 0,
    "expected to discover rule modules in src/rules"
  )

  const registeredIds = rules.map((rule) => rule.id)
  const registeredIdSet = new Set(registeredIds)

  const unregistered = discovered
    .filter((entry) => !registeredIdSet.has(entry.rule.id))
    .map((entry) => `${entry.fileName} exports ${entry.exportName} (${entry.rule.id})`)

  assert.deepEqual(
    unregistered,
    [],
    "expected every Rule exported from src/rules to appear in the rules array of src/rules/index.ts"
  )

  const discoveredIdSet = new Set(discovered.map((entry) => entry.rule.id))
  const phantom = registeredIds.filter((ruleId) => !discoveredIdSet.has(ruleId))

  assert.deepEqual(
    phantom,
    [],
    "expected every registered rule id to come from a module in src/rules"
  )

  const duplicateIds = registeredIds.filter(
    (ruleId, index) => registeredIds.indexOf(ruleId) !== index
  )

  assert.deepEqual(
    duplicateIds,
    [],
    "expected the rules array to register every rule exactly once"
  )

  assert.equal(
    rules.length,
    discovered.length,
    "expected the rules array to have one entry per discovered Rule export"
  )
})
