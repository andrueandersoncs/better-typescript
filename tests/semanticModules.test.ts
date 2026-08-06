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
import { normalizationManifest } from "./fixtures/semantic-modules-normalization/manifest.js"
import { singletonManifest } from "./fixtures/semantic-modules/manifest.js"
import { resolveSemanticModuleFixtureManifest } from "./semanticModuleFixtures.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "semantic-modules")
const normalizationFixturePath = path.join(
  testDirectory,
  "fixtures",
  "semantic-modules-normalization"
)

const fixtureSnapshotAt = async (
  projectPath: string,
  reverseSourceFiles = false,
  includeSourceFile: (sourceFile: ts.SourceFile) => boolean = () => true
) => {
  const workspace = await Effect.runPromise(loadProject(projectPath))
  const project = workspace.projects[0]

  assert.ok(project !== undefined)

  const context = makeContext(project.rootPath)(project.program)
  const projectSourceFiles = Array.filter(project.program.getSourceFiles(), isProjectSourceFile)
  const includedSourceFiles = Array.filter(projectSourceFiles, includeSourceFile)
  const sourceFiles = reverseSourceFiles ? Array.reverse(includedSourceFiles) : includedSourceFiles
  const planningContext = ProgramMatchContext.make({ ...context, sourceFiles })

  return buildSemanticModuleSnapshot(planningContext)
}

const fixtureSnapshot = (reverseSourceFiles = false) =>
  fixtureSnapshotAt(fixturePath, reverseSourceFiles)

const parserRecoverySnapshot = () => {
  const sourceText = "function () {}\n"
  const projectRoot = path.join(testDirectory, "parser-recovery")
  const fileName = path.join(projectRoot, "broken.ts")
  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noEmit: true
  }
  const baseHost = ts.createCompilerHost(compilerOptions)
  const host: ts.CompilerHost = {
    ...baseHost,
    fileExists: (requestedFileName) =>
      requestedFileName === fileName || baseHost.fileExists(requestedFileName),
    readFile: (requestedFileName) =>
      requestedFileName === fileName ? sourceText : baseHost.readFile(requestedFileName),
    getSourceFile: (requestedFileName, languageVersion, onError, shouldCreateNewSourceFile) =>
      requestedFileName === fileName
        ? ts.createSourceFile(requestedFileName, sourceText, languageVersion, true)
        : baseHost.getSourceFile(
            requestedFileName,
            languageVersion,
            onError,
            shouldCreateNewSourceFile
          )
  }
  const program = ts.createProgram([fileName], compilerOptions, host)
  const sourceFile = program.getSourceFile(fileName)

  assert.ok(sourceFile !== undefined)

  const context = makeContext(projectRoot)(program)
  const planningContext = ProgramMatchContext.make({ ...context, sourceFiles: [sourceFile] })

  return {
    diagnostics: program.getSyntacticDiagnostics(sourceFile),
    snapshot: buildSemanticModuleSnapshot(planningContext)
  }
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

test("normalizes every declaration family and excludes ambient candidates", async () => {
  const snapshot = await fixtureSnapshotAt(normalizationFixturePath)
  const resolvedManifest = resolveSemanticModuleFixtureManifest(normalizationManifest, snapshot)
  const observedModules = Array.map(snapshot.modules, (module) => module.members)

  assert.deepEqual(observedModules, resolvedManifest.modules)
  assert.equal(snapshot.entities.length, 14)
  assert.equal(snapshot.modules.length, 14)
  assert.deepEqual(snapshot.acceptedBonds, [])
  assert.deepEqual(snapshot.suppressedBonds, [])

  const parseEntity = Option.getOrThrow(
    Array.findFirst(
      snapshot.entities,
      (entity) => entity.declarationKind === "FunctionDeclaration" && entity.displayName === "parse"
    )
  )

  assert.equal(parseEntity.declarationAnchors.length, 3)
  assert.deepEqual(parseEntity.key, parseEntity.declarationAnchors[0])

  const variables = Array.filter(
    snapshot.entities,
    (entity) => entity.key.path === "src/variables.ts"
  )

  assert.deepEqual(
    Array.map(variables, (entity) => entity.displayName),
    ["single", "renamed, first, rest"]
  )
  assert.equal(
    Array.every(variables, (entity) => entity.key.syntaxKind === ts.SyntaxKind.VariableDeclaration),
    true
  )

  const namespaceDisplays = Array.map(
    Array.filter(snapshot.entities, (entity) => entity.declarationKind === "ModuleDeclaration"),
    (entity) => entity.displayName
  )

  assert.deepEqual(namespaceDisplays, ["Service", "Repeat", "Repeat", "Dotted.Inner"])
  assert.deepEqual(
    Array.map(snapshot.exclusions, (exclusion) => exclusion.reason),
    Array.replicate("ambient-declaration" as const, 7)
  )
  assert.deepEqual(
    Array.map(snapshot.exclusions, (exclusion) => exclusion.anchor.syntaxKind),
    [
      ts.SyntaxKind.FunctionDeclaration,
      ts.SyntaxKind.ClassDeclaration,
      ts.SyntaxKind.InterfaceDeclaration,
      ts.SyntaxKind.TypeAliasDeclaration,
      ts.SyntaxKind.EnumDeclaration,
      ts.SyntaxKind.VariableDeclaration,
      ts.SyntaxKind.ModuleDeclaration
    ]
  )

  const edgeOnlyPaths = ["src/aliases.ts", "src/defaultExpression.ts", "src/exportAssignment.cts"]
  const observedPaths = Array.appendAll(
    Array.map(snapshot.entities, (entity) => entity.key.path),
    Array.map(snapshot.exclusions, (exclusion) => exclusion.anchor.path)
  )

  assert.equal(
    Array.some(edgeOnlyPaths, (edgePath) => Array.contains(observedPaths, edgePath)),
    false
  )
  assert.equal(Object.isFrozen(snapshot.exclusions), true)
  assert.equal(Array.every(snapshot.exclusions, Object.isFrozen), true)

  const reversedSnapshot = await fixtureSnapshotAt(normalizationFixturePath, true)

  assert.equal(JSON.stringify(reversedSnapshot), JSON.stringify(snapshot))
})

test("leaves sources outside matcher scope absent", async () => {
  const snapshot = await fixtureSnapshotAt(
    normalizationFixturePath,
    false,
    (sourceFile) => !sourceFile.fileName.endsWith("/variables.ts")
  )
  const observedPaths = Array.appendAll(
    Array.map(snapshot.entities, (entity) => entity.key.path),
    Array.map(snapshot.exclusions, (exclusion) => exclusion.anchor.path)
  )

  assert.equal(Array.contains(observedPaths, "src/variables.ts"), false)
})

test("excludes parser-recovery declarations without synthetic identity", () => {
  const { diagnostics, snapshot } = parserRecoverySnapshot()

  assert.equal(diagnostics.length > 0, true)
  assert.deepEqual(snapshot.entities, [])
  assert.deepEqual(snapshot.modules, [])
  assert.deepEqual(snapshot.exclusions, [
    {
      anchor: {
        path: "broken.ts",
        start: 0,
        end: 14,
        syntaxKind: ts.SyntaxKind.FunctionDeclaration
      },
      reason: "missing-symbol"
    }
  ])
})
