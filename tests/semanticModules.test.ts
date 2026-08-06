import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "bun:test"
import { Array, Effect, Option } from "effect"
import * as ts from "typescript"
import { loadProject } from "@better-typescript/core/project/loadProject"
import {
  buildSemanticModuleSnapshot,
  moduleFor,
  peersFor,
  proofBetween,
  type SemanticModuleEntityKey
} from "@better-typescript/matchers/builtins/architectureExplore/semanticModules.js"
import { ProgramMatchContext } from "@better-typescript/matchers/matcher/data"
import { isProjectSourceFile, makeContext } from "@better-typescript/matchers/sources"
import { singletonManifest } from "./fixtures/semantic-modules/manifest.js"
import { resolveSemanticModuleFixtureManifest } from "./semanticModuleFixtures.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "semantic-modules")

const fixtureSnapshot = async (reverseSourceFiles = false) => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const project = workspace.projects[0]

  assert.ok(project !== undefined)

  const context = makeContext(project.rootPath)(project.program)
  const sourceFiles = Array.filter(project.program.getSourceFiles(), isProjectSourceFile)
  const orderedSourceFiles = reverseSourceFiles ? Array.reverse(sourceFiles) : sourceFiles
  const planningContext = ProgramMatchContext.make({ ...context, sourceFiles: orderedSourceFiles })

  return buildSemanticModuleSnapshot(planningContext)
}

const expectedKeys: ReadonlyArray<SemanticModuleEntityKey> = [
  {
    path: "src/singletons.ts",
    start: 0,
    end: 55,
    syntaxKind: ts.SyntaxKind.FunctionDeclaration
  },
  {
    path: "src/singletons.ts",
    start: 57,
    end: 102,
    syntaxKind: ts.SyntaxKind.ClassDeclaration
  },
  {
    path: "src/singletons.ts",
    start: 104,
    end: 154,
    syntaxKind: ts.SyntaxKind.InterfaceDeclaration
  },
  {
    path: "src/singletons.ts",
    start: 156,
    end: 187,
    syntaxKind: ts.SyntaxKind.TypeAliasDeclaration
  },
  {
    path: "src/status.ts",
    start: 0,
    end: 40,
    syntaxKind: ts.SyntaxKind.EnumDeclaration
  }
]

const expectedEntities = [
  {
    key: expectedKeys[0],
    declarationAnchors: [expectedKeys[0]],
    stratum: "production",
    displayName: "parse",
    declarationKind: "FunctionDeclaration"
  },
  {
    key: expectedKeys[1],
    declarationAnchors: [expectedKeys[1]],
    stratum: "production",
    displayName: "Box",
    declarationKind: "ClassDeclaration"
  },
  {
    key: expectedKeys[2],
    declarationAnchors: [expectedKeys[2]],
    stratum: "production",
    displayName: "Named",
    declarationKind: "InterfaceDeclaration"
  },
  {
    key: expectedKeys[3],
    declarationAnchors: [expectedKeys[3]],
    stratum: "production",
    displayName: "Identifier",
    declarationKind: "TypeAliasDeclaration"
  },
  {
    key: expectedKeys[4],
    declarationAnchors: [expectedKeys[4]],
    stratum: "production",
    displayName: "Status",
    declarationKind: "EnumDeclaration"
  }
]

const expectedModules = Array.map(expectedKeys, (key) => ({ members: [key], forestBondKeys: [] }))

test("normalizes basic declarations into a portable singleton snapshot", async () => {
  const snapshot = await fixtureSnapshot()
  const expected = {
    entities: expectedEntities,
    modules: expectedModules,
    acceptedBonds: [],
    suppressedBonds: [],
    exclusions: []
  }

  assert.deepEqual(snapshot, expected)
  assert.deepEqual(Object.keys(snapshot), [
    "entities",
    "modules",
    "acceptedBonds",
    "suppressedBonds",
    "exclusions"
  ])

  const serialized = JSON.stringify(snapshot)

  assert.deepEqual(JSON.parse(serialized), snapshot)
  const reversedSnapshot = await fixtureSnapshot(true)

  assert.equal(JSON.stringify(reversedSnapshot), serialized)
  assert.equal(serialized.includes(fixturePath), false)
  assert.equal(Object.isFrozen(snapshot), true)
  assert.equal(Object.isFrozen(snapshot.entities), true)
  assert.equal(Array.every(snapshot.entities, Object.isFrozen), true)

  const resolvedManifest = resolveSemanticModuleFixtureManifest(singletonManifest, snapshot)
  const observedModules = Array.map(snapshot.modules, (module) => module.members)

  assert.deepEqual(observedModules, resolvedManifest.modules)
})

test("queries singleton membership without compiler state", async () => {
  const snapshot = await fixtureSnapshot()
  const firstKey = expectedKeys[0]
  const secondKey = expectedKeys[1]

  assert.ok(firstKey !== undefined)
  assert.ok(secondKey !== undefined)
  assert.deepEqual(Option.getOrThrow(moduleFor(firstKey)(snapshot)), expectedModules[0])
  assert.deepEqual(Option.getOrThrow(peersFor(firstKey)(snapshot)), [])
  assert.deepEqual(Option.getOrThrow(proofBetween(firstKey, firstKey)(snapshot)), [])
  assert.equal(Option.isNone(proofBetween(firstKey, secondKey)(snapshot)), true)

  const unknownKey: SemanticModuleEntityKey = {
    path: "src/unknown.ts",
    start: 0,
    end: 1,
    syntaxKind: ts.SyntaxKind.FunctionDeclaration
  }

  assert.equal(Option.isNone(moduleFor(unknownKey)(snapshot)), true)
  assert.equal(Option.isNone(peersFor(unknownKey)(snapshot)), true)
  assert.equal(Option.isNone(proofBetween(firstKey, unknownKey)(snapshot)), true)
  assert.equal(Option.isNone(proofBetween(unknownKey, unknownKey)(snapshot)), true)
})
