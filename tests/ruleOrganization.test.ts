import * as assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import * as path from "node:path"
import { test } from "bun:test"
import { builtinRules } from "@better-typescript/rules/builtinRules"
import { expectedRuleNames } from "./expectedBuiltinRuleNames.js"

const sourceRoot = path.join(import.meta.dir, "../packages/rules/src")
const rulesRoot = path.join(sourceRoot, "rules")
const sourceExtension = /\.ts$/u
const staticImport = /(?:\bfrom\s+|\bimport\s+)["']([^"']+)["']/gu
const nonSourceDirectoryNames = new Set(["fixtures", "test"])

const sourceFilesIn = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)

    return entry.isDirectory()
      ? nonSourceDirectoryNames.has(entry.name)
        ? []
        : sourceFilesIn(entryPath)
      : sourceExtension.test(entry.name)
        ? [entryPath]
        : []
  })

const importedSource = (source: string, specifier: string) => {
  if (!specifier.startsWith(".")) return undefined

  return path.resolve(path.dirname(source), specifier.replace(/\.js$/u, ".ts"))
}

const importsOf = (source: string) =>
  [...readFileSync(source, "utf8").matchAll(staticImport)].flatMap((match) => {
    const imported = importedSource(source, match[1]!)

    return imported ? [imported] : []
  })

const reachableFrom = (entry: string) => {
  const reachable = new Set<string>()
  const pending = [entry]

  while (pending.length > 0) {
    const source = pending.pop()!

    if (!reachable.has(source)) {
      reachable.add(source)
      pending.push(...importsOf(source))
    }
  }

  return reachable
}

test("every built-in Rule has one canonical directory entry", async () => {
  const directoryNames = readdirSync(rulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  assert.deepEqual(directoryNames, expectedRuleNames)

  for (const name of directoryNames) {
    const home = path.join(rulesRoot, name)
    const testEntry = path.join(home, "test", "index.test.ts")
    const fixtures = path.join(home, "fixtures")

    assert.ok(existsSync(testEntry), `${name} must own test/index.test.ts`)
    assert.ok(existsSync(fixtures), `${name} must own fixtures/`)
    assert.ok(
      sourceFilesIn(fixtures).length > 0,
      `${name} must own at least one TypeScript fixture`
    )

    const module = await import(path.join(home, "index.ts"))
    const rules = Object.values(module).filter(
      (value): value is (typeof builtinRules)[number] =>
        typeof value === "object" &&
        value !== null &&
        "name" in value &&
        typeof value.name === "string" &&
        "check" in value &&
        typeof value.check === "function"
    )

    assert.equal(rules.length, 1)
    assert.equal(rules[0]!.name, name)
    assert.equal(builtinRules.filter((rule) => rule === rules[0]).length, 1)
  }
})

test("only reusable multi-Rule code stays shared", () => {
  const ownerNames = new Map<string, Set<string>>()

  for (const name of expectedRuleNames) {
    const entry = path.join(rulesRoot, name, "index.ts")

    for (const source of reachableFrom(entry)) {
      const owners = ownerNames.get(source) ?? new Set<string>()
      owners.add(name)
      ownerNames.set(source, owners)
    }
  }

  for (const source of sourceFilesIn(path.join(sourceRoot, "internal"))) {
    const owners = ownerNames.get(source)

    assert.ok(owners && owners.size > 1, `${path.relative(sourceRoot, source)} is not shared`)
  }

  for (const name of expectedRuleNames) {
    const home = path.join(rulesRoot, name)

    for (const source of sourceFilesIn(home)) {
      assert.deepEqual(ownerNames.get(source), new Set([name]))
    }
  }
})
