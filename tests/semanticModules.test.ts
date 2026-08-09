import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array, Effect, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { emptySemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/emptySemanticModuleHardBondRuleCatalog"
import { semanticModuleEngine } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine"
import type { SemanticModuleEntityKey } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEntityKey"
import type { SemanticModuleHardBondRule } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRule"
import type { SemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRuleCatalog"
import { barrierManifest } from "./fixtures/semantic-modules-barrier/manifest.js"
import { labelRemapManifest } from "./fixtures/semantic-modules-label-remap/manifest.js"
import { bondsManifest } from "./fixtures/semantic-modules-bonds/manifest.js"
import { dependenciesManifest } from "./fixtures/semantic-modules-dependencies/manifest.js"
import { normalizationManifest } from "./fixtures/semantic-modules-normalization/manifest.js"
import { triangleManifest } from "./fixtures/semantic-modules-triangle/manifest.js"
import { singletonManifest } from "./fixtures/semantic-modules/manifest.js"
import { resolveSemanticModuleFixtureManifest } from "./resolveSemanticModuleFixtureManifest.js"
import { barrierFixturePath } from "./semanticModulesBarrierFixturePath.js"
import { cycleAfterFixturePath } from "./semanticModulesCycleAfterFixturePath.js"
import { cycleBeforeFixturePath } from "./semanticModulesCycleBeforeFixturePath.js"
import { bondsFixturePath } from "./semanticModulesBondsFixturePath.js"
import { dependenciesFixturePath } from "./semanticModulesDependenciesFixturePath.js"
import { expectedEntities } from "./semanticModulesExpectedEntities.js"
import { expectedKeys } from "./semanticModulesExpectedKeys.js"
import { expectedModules } from "./semanticModulesExpectedModules.js"
import { labelRemapFixturePath } from "./semanticModulesLabelRemapFixturePath.js"
import { ownershipDeltaFixturePath } from "./semanticModulesOwnershipDeltaFixturePath.js"
import { programIsolationFixturePath } from "./semanticModulesProgramIsolationFixturePath.js"
import { fixtureSnapshot } from "./semanticModulesFixtureSnapshot.js"
import { fixtureSnapshotAt } from "./semanticModulesFixtureSnapshotAt.js"
import { fixturePath } from "./semanticModulesFixturePath.js"
import { keyByLabel } from "./semanticModulesKeyByLabel.js"
import { neutralReferenceCatalog } from "./semanticModulesNeutralReferenceCatalog.js"
import { normalizationFixturePath } from "./semanticModulesNormalizationFixturePath.js"
import { parserRecoverySnapshot } from "./semanticModulesParserRecoverySnapshot.js"
import { triangleFixturePath } from "./semanticModulesTriangleFixturePath.js"

test("exposes one semantic module engine seam", () => {
  assert.equal(typeof semanticModuleEngine.buildSemanticModuleSnapshot, "function")
  assert.equal(typeof semanticModuleEngine.semanticModulePlacementMatcher, "function")
  assert.equal(typeof semanticModuleEngine.moduleFor, "function")
  assert.equal(typeof semanticModuleEngine.peersFor, "function")
  assert.equal(typeof semanticModuleEngine.proofBetween, "function")
})

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
  assert.deepEqual(
    Option.getOrThrow(semanticModuleEngine.moduleFor(firstKey)(snapshot)),
    expectedModules[0]
  )
  assert.deepEqual(Option.getOrThrow(semanticModuleEngine.peersFor(firstKey)(snapshot)), [])
  assert.deepEqual(
    Option.getOrThrow(semanticModuleEngine.proofBetween(firstKey, firstKey)(snapshot)),
    []
  )
  assert.equal(
    Option.isNone(semanticModuleEngine.proofBetween(firstKey, secondKey)(snapshot)),
    true
  )

  const unknownKey: SemanticModuleEntityKey = {
    path: "src/unknown.ts",
    start: 0,
    end: 1,
    syntaxKind: ts.SyntaxKind.FunctionDeclaration
  }

  assert.equal(Option.isNone(semanticModuleEngine.moduleFor(unknownKey)(snapshot)), true)
  assert.equal(Option.isNone(semanticModuleEngine.peersFor(unknownKey)(snapshot)), true)
  assert.equal(
    Option.isNone(semanticModuleEngine.proofBetween(firstKey, unknownKey)(snapshot)),
    true
  )
  assert.equal(
    Option.isNone(semanticModuleEngine.proofBetween(unknownKey, unknownKey)(snapshot)),
    true
  )
})

test("normalizes every declaration family and excludes ambient candidates", async () => {
  const snapshot = await fixtureSnapshotAt(normalizationFixturePath)
  const resolvedManifest = resolveSemanticModuleFixtureManifest(normalizationManifest, snapshot)
  const observedModules = Array.map(snapshot.modules, (module) => module.members)

  assert.deepEqual(observedModules, resolvedManifest.modules)
  assert.equal(snapshot.entities.length, 14)
  assert.equal(snapshot.modules.length, 11)
  assert.equal(snapshot.acceptedBonds.length, 3)
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

test("closes same-symbol hard bonds and coalesces exact duplicates", async () => {
  const snapshot = await fixtureSnapshotAt(bondsFixturePath)
  const resolved = resolveSemanticModuleFixtureManifest(bondsManifest, snapshot)
  const observedModules = Array.map(snapshot.modules, (module) => module.members)

  assert.deepEqual(observedModules, resolved.modules)
  assert.equal(snapshot.acceptedBonds.length, 3)
  assert.deepEqual(snapshot.suppressedBonds, [])
  assert.equal(
    Array.every(
      snapshot.acceptedBonds,
      (bond) =>
        bond.key.ruleId === "same-symbol-ownership" && bond.evidence.ruleId === bond.key.ruleId
    ),
    true
  )

  const boxModule = Option.getOrThrow(
    semanticModuleEngine.moduleFor(keyByLabel(resolved)("box-value"))(snapshot)
  )
  const tokenModule = Option.getOrThrow(
    semanticModuleEngine.moduleFor(keyByLabel(resolved)("token-type"))(snapshot)
  )
  const codecModule = Option.getOrThrow(
    semanticModuleEngine.moduleFor(keyByLabel(resolved)("codec-function"))(snapshot)
  )

  assert.equal(boxModule.members.length, 2)
  assert.equal(tokenModule.members.length, 2)
  assert.equal(codecModule.members.length, 2)
  assert.equal(boxModule.forestBondKeys.length, 1)
  assert.equal(tokenModule.forestBondKeys.length, 1)
  assert.equal(codecModule.forestBondKeys.length, 1)

  const reversed = await fixtureSnapshotAt(bondsFixturePath, true)

  assert.equal(JSON.stringify(reversed), JSON.stringify(snapshot))
  assert.equal(Object.isFrozen(snapshot.acceptedBonds), true)
  assert.equal(Array.every(snapshot.acceptedBonds, Object.isFrozen), true)
})

test("keeps ordinary dependencies and cycles as non-bonding", async () => {
  const snapshot = await fixtureSnapshotAt(dependenciesFixturePath)
  const resolved = resolveSemanticModuleFixtureManifest(dependenciesManifest, snapshot)

  assert.deepEqual(
    Array.map(snapshot.modules, (module) => module.members),
    resolved.modules
  )
  assert.deepEqual(snapshot.acceptedBonds, [])
  assert.deepEqual(snapshot.suppressedBonds, [])
  assert.equal(snapshot.modules.length, snapshot.entities.length)
})

test("infers cycle and exclusive-consumer neutral hard bonds", async () => {
  const catalog = neutralReferenceCatalog
  const snapshot = await fixtureSnapshotAt(dependenciesFixturePath, false, () => true, catalog)
  const resolved = resolveSemanticModuleFixtureManifest(dependenciesManifest, snapshot)
  const isEven = keyByLabel(resolved)("isEven")
  const isOdd = keyByLabel(resolved)("isOdd")
  const service = keyByLabel(resolved)("Service")
  const client = keyByLabel(resolved)("Client")
  const trimOrderId = keyByLabel(resolved)("trimOrderId")
  const normalizeOrder = keyByLabel(resolved)("normalizeOrder")
  const parseOrder = keyByLabel(resolved)("parseOrder")
  const unownedHelper = keyByLabel(resolved)("unownedHelper")
  const aliasConsumer = keyByLabel(resolved)("aliasConsumer")
  const aliasedHelper = keyByLabel(resolved)("aliasedHelper")

  assert.deepEqual(Option.getOrThrow(semanticModuleEngine.moduleFor(isEven)(snapshot)).members, [
    isEven,
    isOdd
  ])
  assert.deepEqual(Option.getOrThrow(semanticModuleEngine.moduleFor(service)(snapshot)).members, [
    service,
    client
  ])
  assert.deepEqual(
    Option.getOrThrow(semanticModuleEngine.moduleFor(trimOrderId)(snapshot)).members,
    [trimOrderId, normalizeOrder, parseOrder]
  )
  assert.deepEqual(Option.getOrThrow(semanticModuleEngine.peersFor(unownedHelper)(snapshot)), [])
  assert.deepEqual(
    Option.getOrThrow(semanticModuleEngine.moduleFor(aliasConsumer)(snapshot)).members,
    [aliasConsumer, aliasedHelper]
  )
  assert.equal(
    Array.countBy(snapshot.acceptedBonds, (bond) => bond.key.ruleId === "semantic-reference-cycle"),
    1
  )
  assert.equal(
    Array.countBy(
      snapshot.acceptedBonds,
      (bond) => bond.key.ruleId === "exclusive-consumer-ownership"
    ),
    4
  )
  assert.equal(
    Array.every(snapshot.acceptedBonds, (bond) => bond.evidence.version === 1),
    true
  )
  const cycleBond = Array.findFirst(
    snapshot.acceptedBonds,
    (bond) => bond.key.ruleId === "semantic-reference-cycle"
  )
  const cycleEvidence = Option.getOrThrow(cycleBond).evidence

  assert.ok(globalThis.Array.isArray(cycleEvidence.component))
  assert.equal(Object.isFrozen(cycleEvidence.component), true)
  assert.equal(Object.isFrozen(cycleEvidence.component[0]), true)
  const reversed = await fixtureSnapshotAt(dependenciesFixturePath, true, () => true, catalog)

  assert.equal(JSON.stringify(reversed), JSON.stringify(snapshot))
})

test("ignores reference consumers outside the matcher scope", async () => {
  const snapshot = await fixtureSnapshotAt(
    dependenciesFixturePath,
    false,
    (sourceFile) => !sourceFile.fileName.endsWith("/consumer.ts"),
    neutralReferenceCatalog
  )
  const aliasedHelper = pipe(
    snapshot.entities,
    Array.findFirst((entity) => entity.displayName === "aliasedHelper"),
    Option.map((entity) => entity.key),
    Option.getOrThrow
  )

  assert.deepEqual(Option.getOrThrow(semanticModuleEngine.peersFor(aliasedHelper)(snapshot)), [])
})

test("retains accepted redundant bonds while proving unique forest paths", async () => {
  const snapshot = await fixtureSnapshotAt(triangleFixturePath)
  const resolved = resolveSemanticModuleFixtureManifest(triangleManifest, snapshot)
  const pointX = keyByLabel(resolved)("point-x")
  const pointY = keyByLabel(resolved)("point-y")
  const pointNamespace = keyByLabel(resolved)("point-namespace")
  const module = Option.getOrThrow(semanticModuleEngine.moduleFor(pointX)(snapshot))

  assert.deepEqual(module.members, resolved.modules[0])
  assert.equal(snapshot.acceptedBonds.length, 3)
  assert.equal(module.forestBondKeys.length, 2)
  assert.deepEqual(
    Option.getOrThrow(semanticModuleEngine.proofBetween(pointX, pointX)(snapshot)),
    []
  )

  const forward = Option.getOrThrow(semanticModuleEngine.proofBetween(pointX, pointY)(snapshot))
  const reverse = Option.getOrThrow(semanticModuleEngine.proofBetween(pointY, pointX)(snapshot))
  const across = Option.getOrThrow(
    semanticModuleEngine.proofBetween(pointX, pointNamespace)(snapshot)
  )

  assert.equal(forward.length > 0, true)
  assert.equal(reverse.length, forward.length)
  assert.deepEqual(
    Array.map(reverse, (step) => step.direction),
    Array.map(Array.reverse(forward), (step) =>
      step.direction === "forward" ? "reverse" : "forward"
    )
  )
  assert.equal(across.length > 0, true)
  assert.equal(
    Array.every(forward, (step) =>
      Array.some(
        module.forestBondKeys,
        (key) => JSON.stringify(key) === JSON.stringify(step.bondKey)
      )
    ),
    true
  )

  const peers = Option.getOrThrow(semanticModuleEngine.peersFor(pointX)(snapshot))

  assert.deepEqual(peers, [pointY, pointNamespace])
  assert.equal(
    Option.isNone(
      semanticModuleEngine.proofBetween(pointX, {
        path: "src/missing.ts",
        start: 0,
        end: 1,
        syntaxKind: ts.SyntaxKind.InterfaceDeclaration
      })(snapshot)
    ),
    true
  )

  const reversed = await fixtureSnapshotAt(triangleFixturePath, true)

  assert.equal(JSON.stringify(reversed), JSON.stringify(snapshot))
})

test("suppresses production and test barrier candidates without merging", async () => {
  const snapshot = await fixtureSnapshotAt(barrierFixturePath)
  const resolved = resolveSemanticModuleFixtureManifest(barrierManifest, snapshot)

  assert.deepEqual(
    Array.map(snapshot.modules, (module) => module.members),
    resolved.modules
  )
  assert.deepEqual(snapshot.acceptedBonds, [])
  assert.equal(snapshot.suppressedBonds.length, 2)
  assert.equal(
    Array.every(
      snapshot.suppressedBonds,
      (bond) => bond.reason === "production-test-partition-barrier"
    ),
    true
  )

  const sharedProd = keyByLabel(resolved)("shared-prod")
  const sharedTest = keyByLabel(resolved)("shared-test")

  assert.equal(
    Option.isNone(semanticModuleEngine.proofBetween(sharedProd, sharedTest)(snapshot)),
    true
  )
  assert.deepEqual(Option.getOrThrow(semanticModuleEngine.peersFor(sharedProd)(snapshot)), [])
  assert.equal(Object.isFrozen(snapshot.suppressedBonds), true)
  assert.equal(Array.every(snapshot.suppressedBonds, Object.isFrozen), true)

  const reversed = await fixtureSnapshotAt(barrierFixturePath, true)

  assert.equal(JSON.stringify(reversed), JSON.stringify(snapshot))
})

test("applies explicit paradigm catalog bonds without defaulting the catalog", async () => {
  const snapshotBase = await fixtureSnapshotAt(dependenciesFixturePath)
  const resolved = resolveSemanticModuleFixtureManifest(dependenciesManifest, snapshotBase)
  const user = keyByLabel(resolved)("User")
  const makeUser = keyByLabel(resolved)("makeUser")

  const companionRule: SemanticModuleHardBondRule = {
    id: "test-companion-pair",
    evidenceSchema: Schema.Struct({
      _tag: Schema.Literal("test-companion-pair"),
      premise: Schema.String
    }),
    candidates: (_context, entities) => {
      const left = Array.findFirst(entities, (entity) => entity.displayName === "User")
      const right = Array.findFirst(entities, (entity) => entity.displayName === "makeUser")

      return pipe(
        Option.all({ left, right }),
        Option.map(({ left: leftEntity, right: rightEntity }) => [
          {
            left: leftEntity.key,
            right: rightEntity.key,
            evidenceKey: "test-companion-pair:User:makeUser",
            evidence: {
              _tag: "test-companion-pair",
              premise: "fixture-owned companion pair"
            }
          },
          {
            left: leftEntity.key,
            right: rightEntity.key,
            evidenceKey: "test-companion-pair:User:makeUser",
            evidence: {
              _tag: "test-companion-pair",
              premise: "fixture-owned companion pair"
            }
          }
        ]),
        Option.getOrElse(() => [])
      )
    }
  }

  const catalog = Object.freeze([companionRule])
  const snapshot = await fixtureSnapshotAt(dependenciesFixturePath, false, () => true, catalog)

  assert.equal(snapshot.acceptedBonds.length, 1)
  assert.equal(snapshot.acceptedBonds[0]?.key.ruleId, "test-companion-pair")
  assert.equal(snapshot.acceptedBonds[0]?.evidence._tag, "test-companion-pair")
  assert.deepEqual(Option.getOrThrow(semanticModuleEngine.moduleFor(user)(snapshot)).members, [
    user,
    makeUser
  ])
  assert.deepEqual(Option.getOrThrow(semanticModuleEngine.peersFor(user)(snapshot)), [makeUser])
  assert.equal(
    Option.getOrThrow(semanticModuleEngine.proofBetween(user, makeUser)(snapshot)).length,
    1
  )
})

test("rejects paradigm evidence that does not match its rule schema", async () => {
  const base = await fixtureSnapshotAt(dependenciesFixturePath)
  const left = base.entities[0]
  const right = base.entities[1]

  assert.ok(left !== undefined)
  assert.ok(right !== undefined)

  const invalidEvidenceRule = {
    id: "invalid-evidence",
    evidenceSchema: Schema.Struct({
      _tag: Schema.Literal("valid-evidence")
    }),
    candidates: () => [
      {
        left: left.key,
        right: right.key,
        evidenceKey: "invalid-evidence",
        evidence: { _tag: "invalid-evidence" }
      }
    ]
  } satisfies SemanticModuleHardBondRule

  await assert.rejects(
    fixtureSnapshotAt(
      dependenciesFixturePath,
      false,
      () => true,
      Object.freeze([invalidEvidenceRule])
    )
  )
})

test("byte-identity survives candidate enumeration order and empty catalog identity", async () => {
  const first = await fixtureSnapshotAt(triangleFixturePath)
  const second = await fixtureSnapshotAt(triangleFixturePath, true)
  const thirdCatalog = Object.freeze([...emptySemanticModuleHardBondRuleCatalog])
  const third = await fixtureSnapshotAt(triangleFixturePath, false, () => true, thirdCatalog)

  assert.equal(JSON.stringify(first), JSON.stringify(second))
  assert.equal(JSON.stringify(first), JSON.stringify(third))
})

test("isolates snapshots when Programs reuse portable entity keys", async () => {
  const first = await fixtureSnapshotAt(triangleFixturePath)
  const isolated = await fixtureSnapshotAt(programIsolationFixturePath)
  const repeated = await fixtureSnapshotAt(triangleFixturePath)
  const sharedFirst = first.entities[0]
  const sharedIsolated = isolated.entities[0]
  const firstPeer = first.entities[1]

  assert.ok(sharedFirst !== undefined)
  assert.ok(sharedIsolated !== undefined)
  assert.ok(firstPeer !== undefined)
  assert.deepEqual(sharedIsolated.key, sharedFirst.key)
  assert.equal(
    Option.getOrThrow(semanticModuleEngine.moduleFor(sharedFirst.key)(first)).members.length,
    3
  )
  assert.equal(
    Option.getOrThrow(semanticModuleEngine.moduleFor(sharedIsolated.key)(isolated)).members.length,
    1
  )
  assert.equal(
    Option.isSome(semanticModuleEngine.proofBetween(sharedFirst.key, firstPeer.key)(first)),
    true
  )
  assert.equal(
    Option.isNone(semanticModuleEngine.proofBetween(sharedIsolated.key, firstPeer.key)(isolated)),
    true
  )
  assert.deepEqual(isolated.acceptedBonds, [])
  assert.equal(JSON.stringify(repeated), JSON.stringify(first))
})

test("preserves membership and proof topology across portable label remapping", async () => {
  const original = await fixtureSnapshotAt(triangleFixturePath)
  const remapped = await fixtureSnapshotAt(labelRemapFixturePath)
  const originalManifest = resolveSemanticModuleFixtureManifest(triangleManifest, original)
  const remappedManifest = resolveSemanticModuleFixtureManifest(labelRemapManifest, remapped)

  const normalize = (
    snapshot: typeof original,
    resolved: ReturnType<typeof resolveSemanticModuleFixtureManifest>
  ) => {
    const labelFor = (key: SemanticModuleEntityKey) =>
      pipe(
        resolved.entities,
        Array.findFirst((entity) => JSON.stringify(entity.key) === JSON.stringify(key)),
        Option.map((entity) => entity.label),
        Option.getOrThrow
      )

    const normalizeBond = (bond: (typeof snapshot.acceptedBonds)[number]) => ({
      left: labelFor(bond.key.left),
      right: labelFor(bond.key.right),
      ruleId: bond.key.ruleId,
      evidenceTag: bond.evidence._tag,
      evidenceVersion: bond.evidence.version
    })

    const left = keyByLabel(resolved)("point-x")
    const right = keyByLabel(resolved)("point-namespace")
    const proof = Option.getOrThrow(semanticModuleEngine.proofBetween(left, right)(snapshot))
    const normalizedProof = Array.map(proof, (step) => {
      const evidence = pipe(
        snapshot.acceptedBonds,
        Array.findFirst((bond) => JSON.stringify(bond.key) === JSON.stringify(step.bondKey)),
        Option.map((bond) => bond.evidence),
        Option.getOrThrow
      )

      return {
        left: labelFor(step.bondKey.left),
        right: labelFor(step.bondKey.right),
        ruleId: step.bondKey.ruleId,
        direction: step.direction,
        evidenceTag: evidence._tag,
        evidenceVersion: evidence.version
      }
    })

    return {
      modules: Array.map(snapshot.modules, (module) => Array.map(module.members, labelFor)),
      acceptedBonds: Array.map(snapshot.acceptedBonds, normalizeBond),
      forestBonds: Array.map(snapshot.modules, (module) =>
        Array.map(module.forestBondKeys, (key) => ({
          left: labelFor(key.left),
          right: labelFor(key.right),
          ruleId: key.ruleId
        }))
      ),
      proof: normalizedProof
    }
  }

  assert.deepEqual(normalize(remapped, remappedManifest), normalize(original, originalManifest))
})

test("removes only exclusive ownership when a second consumer appears", async () => {
  const singleConsumer = await fixtureSnapshotAt(
    ownershipDeltaFixturePath,
    false,
    (sourceFile) => !sourceFile.fileName.endsWith("/consumerTwo.ts"),
    neutralReferenceCatalog
  )
  const twoConsumers = await fixtureSnapshotAt(
    ownershipDeltaFixturePath,
    false,
    () => true,
    neutralReferenceCatalog
  )
  const bondIdentity =
    (snapshot: typeof singleConsumer) => (bond: (typeof snapshot.acceptedBonds)[number]) => {
      const nameFor = (key: SemanticModuleEntityKey) =>
        pipe(
          snapshot.entities,
          Array.findFirst((entity) => JSON.stringify(entity.key) === JSON.stringify(key)),
          Option.map((entity) => entity.displayName),
          Option.getOrThrow
        )

      return `${bond.key.ruleId}:${nameFor(bond.key.left)}:${nameFor(bond.key.right)}`
    }
  const before = Array.map(singleConsumer.acceptedBonds, bondIdentity(singleConsumer))
  const after = Array.map(twoConsumers.acceptedBonds, bondIdentity(twoConsumers))
  const afterSet = new Set(after)
  const removed = Array.filter(before, (identity) => !afterSet.has(identity))

  assert.deepEqual(before, ["exclusive-consumer-ownership:consumerOne:owned"])
  assert.deepEqual(after, [])
  assert.deepEqual(removed, before)
})

test("adds only cycle bonds when one edge closes an SCC", async () => {
  const acyclic = await fixtureSnapshotAt(
    cycleBeforeFixturePath,
    false,
    () => true,
    neutralReferenceCatalog
  )
  const cyclic = await fixtureSnapshotAt(
    cycleAfterFixturePath,
    false,
    () => true,
    neutralReferenceCatalog
  )
  const bondIdentity =
    (snapshot: typeof acyclic) => (bond: (typeof snapshot.acceptedBonds)[number]) => {
      const nameFor = (key: SemanticModuleEntityKey) =>
        pipe(
          snapshot.entities,
          Array.findFirst((entity) => JSON.stringify(entity.key) === JSON.stringify(key)),
          Option.map((entity) => entity.displayName),
          Option.getOrThrow
        )

      return `${bond.key.ruleId}:${nameFor(bond.key.left)}:${nameFor(bond.key.right)}`
    }
  const before = Array.map(acyclic.acceptedBonds, bondIdentity(acyclic))
  const after = Array.map(cyclic.acceptedBonds, bondIdentity(cyclic))
  const beforeSet = new Set(before)
  const added = Array.filter(after, (identity) => !beforeSet.has(identity))
  const first = pipe(
    cyclic.entities,
    Array.findFirst((entity) => entity.displayName === "first"),
    Option.map((entity) => entity.key),
    Option.getOrThrow
  )
  const second = pipe(
    cyclic.entities,
    Array.findFirst((entity) => entity.displayName === "second"),
    Option.map((entity) => entity.key),
    Option.getOrThrow
  )

  assert.deepEqual(before, [])
  assert.deepEqual(after, ["semantic-reference-cycle:first:second"])
  assert.deepEqual(added, after)
  assert.equal(
    Option.getOrThrow(semanticModuleEngine.proofBetween(first, second)(cyclic)).length,
    1
  )
})
