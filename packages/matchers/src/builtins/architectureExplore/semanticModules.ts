import {
  Array,
  Equivalence,
  flow,
  Function,
  Match,
  Option,
  Order,
  Predicate,
  Schema,
  Struct,
  pipe
} from "effect"
import * as ts from "typescript"
import type { ProgramMatchContext } from "../../matcher/data.js"
import { toRelativeFileName } from "../../support/paths.js"
import { isTestSourceFile, toWorkspacePath } from "./paths.js"

const declarationKinds = Array.make<
  [
    "FunctionDeclaration",
    "ClassDeclaration",
    "InterfaceDeclaration",
    "TypeAliasDeclaration",
    "EnumDeclaration"
  ]
>(
  "FunctionDeclaration",
  "ClassDeclaration",
  "InterfaceDeclaration",
  "TypeAliasDeclaration",
  "EnumDeclaration"
)

const declarationKindSchema = Schema.Literals(declarationKinds)
const strata = Array.make<["production", "test"]>("production", "test")
const stratumSchema = Schema.Literals(strata)

// EntityKey is portable because compiler objects cannot cross the snapshot seam.
export const SemanticModuleEntityKey = Schema.Struct({
  path: Schema.String,
  start: Schema.Number,
  end: Schema.Number,
  syntaxKind: Schema.Number
})

export interface SemanticModuleEntityKey extends Schema.Schema.Type<
  typeof SemanticModuleEntityKey
> {}

const semanticModuleEntityKeysSchema = Schema.Array(SemanticModuleEntityKey)

// EntityRecord keeps display evidence because names cannot define membership.
export const SemanticModuleEntityRecord = Schema.Struct({
  key: SemanticModuleEntityKey,
  declarationAnchors: semanticModuleEntityKeysSchema,
  stratum: stratumSchema,
  displayName: Schema.String,
  declarationKind: declarationKindSchema
})

export interface SemanticModuleEntityRecord extends Schema.Schema.Type<
  typeof SemanticModuleEntityRecord
> {}

// BondKey is canonical because proof references must be portable.
export const SemanticModuleBondKey = Schema.Struct({
  left: SemanticModuleEntityKey,
  right: SemanticModuleEntityKey,
  ruleId: Schema.String,
  evidenceKey: Schema.String
})

export interface SemanticModuleBondKey extends Schema.Schema.Type<typeof SemanticModuleBondKey> {}

const semanticModuleEvidenceSchema = Schema.Record(Schema.String, Schema.Json)

// AcceptedBond retains evidence because membership must remain auditable.
export const SemanticModuleAcceptedBondRecord = Schema.Struct({
  key: SemanticModuleBondKey,
  evidence: semanticModuleEvidenceSchema
})

export interface SemanticModuleAcceptedBondRecord extends Schema.Schema.Type<
  typeof SemanticModuleAcceptedBondRecord
> {}

const suppressionReasons = Array.make<["production-test-partition-barrier"]>(
  "production-test-partition-barrier"
)

const suppressionReasonSchema = Schema.Literals(suppressionReasons)

// SuppressedBond retains evidence because barriers must not erase candidates.
export const SemanticModuleSuppressedBondRecord = Schema.Struct({
  key: SemanticModuleBondKey,
  evidence: semanticModuleEvidenceSchema,
  reason: suppressionReasonSchema
})

export interface SemanticModuleSuppressedBondRecord extends Schema.Schema.Type<
  typeof SemanticModuleSuppressedBondRecord
> {}

const exclusionReasons = Array.make<["ambient-declaration", "missing-symbol"]>(
  "ambient-declaration",
  "missing-symbol"
)

const exclusionReasonSchema = Schema.Literals(exclusionReasons)

// Exclusion retains anchors because normalization cannot invent identity.
export const SemanticModuleExclusionRecord = Schema.Struct({
  anchor: SemanticModuleEntityKey,
  reason: exclusionReasonSchema
})

export interface SemanticModuleExclusionRecord extends Schema.Schema.Type<
  typeof SemanticModuleExclusionRecord
> {}

const semanticModuleBondKeysSchema = Schema.Array(SemanticModuleBondKey)

// ModuleRecord lists members because modules have no representative identity.
export const SemanticModuleRecord = Schema.Struct({
  members: semanticModuleEntityKeysSchema,
  forestBondKeys: semanticModuleBondKeysSchema
})

export interface SemanticModuleRecord extends Schema.Schema.Type<typeof SemanticModuleRecord> {}

const proofDirections = Array.make<["forward", "reverse"]>("forward", "reverse")
const proofDirectionSchema = Schema.Literals(proofDirections)

// ProofStep has direction because stored bond endpoints stay canonical.
export const SemanticModuleMembershipProofStep = Schema.Struct({
  bondKey: SemanticModuleBondKey,
  direction: proofDirectionSchema
})

export interface SemanticModuleMembershipProofStep extends Schema.Schema.Type<
  typeof SemanticModuleMembershipProofStep
> {}

const semanticModuleEntityRecordsSchema = Schema.Array(SemanticModuleEntityRecord)
const semanticModuleRecordsSchema = Schema.Array(SemanticModuleRecord)
const acceptedBondRecordsSchema = Schema.Array(SemanticModuleAcceptedBondRecord)
const suppressedBondRecordsSchema = Schema.Array(SemanticModuleSuppressedBondRecord)
const exclusionRecordsSchema = Schema.Array(SemanticModuleExclusionRecord)

// SnapshotV1 is the matcher seam because queries must not rescan TypeScript.
export const SemanticModuleSnapshotV1 = Schema.Struct({
  entities: semanticModuleEntityRecordsSchema,
  modules: semanticModuleRecordsSchema,
  acceptedBonds: acceptedBondRecordsSchema,
  suppressedBonds: suppressedBondRecordsSchema,
  exclusions: exclusionRecordsSchema
})

export interface SemanticModuleSnapshotV1 extends Schema.Schema.Type<
  typeof SemanticModuleSnapshotV1
> {}

// BasicDeclaration isolates this slice because later families join the union.
type BasicDeclaration =
  | ts.FunctionDeclaration
  | ts.ClassDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration

const keyPathOrder: Order.Order<SemanticModuleEntityKey> = Order.mapInput(
  Order.String,
  Struct.get("path")
)

const keyStartOrder: Order.Order<SemanticModuleEntityKey> = Order.mapInput(
  Order.Number,
  Struct.get("start")
)

const keyEndOrder: Order.Order<SemanticModuleEntityKey> = Order.mapInput(
  Order.Number,
  Struct.get("end")
)

const keyKindOrder: Order.Order<SemanticModuleEntityKey> = Order.mapInput(
  Order.Number,
  Struct.get("syntaxKind")
)

const keyOrders = Array.make(keyPathOrder, keyStartOrder, keyEndOrder, keyKindOrder)
const entityKeyOrder = Order.combineAll(keyOrders)

const entityRecordOrder: Order.Order<SemanticModuleEntityRecord> = Order.mapInput(
  entityKeyOrder,
  Struct.get("key")
)

const keyPathEquivalence: Equivalence.Equivalence<SemanticModuleEntityKey> = Equivalence.mapInput(
  Equivalence.strictEqual<string>(),
  Struct.get("path")
)

const keyStartEquivalence: Equivalence.Equivalence<SemanticModuleEntityKey> = Equivalence.mapInput(
  Equivalence.strictEqual<number>(),
  Struct.get("start")
)

const keyEndEquivalence: Equivalence.Equivalence<SemanticModuleEntityKey> = Equivalence.mapInput(
  Equivalence.strictEqual<number>(),
  Struct.get("end")
)

const keyKindEquivalence: Equivalence.Equivalence<SemanticModuleEntityKey> = Equivalence.mapInput(
  Equivalence.strictEqual<number>(),
  Struct.get("syntaxKind")
)

const keyEquivalences = Array.make(
  keyPathEquivalence,
  keyStartEquivalence,
  keyEndEquivalence,
  keyKindEquivalence
)

const entityKeyEquivalence = Equivalence.combineAll(keyEquivalences)

const emptyBondKeyValues: ReadonlyArray<SemanticModuleBondKey> = Array.empty()
const emptyBondKeys = Object.freeze(emptyBondKeyValues)
const emptyAcceptedBondValues: ReadonlyArray<SemanticModuleAcceptedBondRecord> = Array.empty()
const emptyAcceptedBonds = Object.freeze(emptyAcceptedBondValues)
const emptySuppressedBondValues: ReadonlyArray<SemanticModuleSuppressedBondRecord> = Array.empty()
const emptySuppressedBonds = Object.freeze(emptySuppressedBondValues)
const emptyExclusionValues: ReadonlyArray<SemanticModuleExclusionRecord> = Array.empty()
const emptyExclusions = Object.freeze(emptyExclusionValues)
const emptyProofValues: ReadonlyArray<SemanticModuleMembershipProofStep> = Array.empty()
const emptyProof = Object.freeze(emptyProofValues)

const functionDeclarationKind = Function.constant("FunctionDeclaration" as const)
const classDeclarationKind = Function.constant("ClassDeclaration" as const)
const interfaceDeclarationKind = Function.constant("InterfaceDeclaration" as const)
const typeAliasDeclarationKind = Function.constant("TypeAliasDeclaration" as const)
const enumDeclarationKind = Function.constant("EnumDeclaration" as const)

const declarationKind = pipe(
  Match.type<BasicDeclaration>(),
  Match.when(ts.isFunctionDeclaration, functionDeclarationKind),
  Match.when(ts.isClassDeclaration, classDeclarationKind),
  Match.when(ts.isInterfaceDeclaration, interfaceDeclarationKind),
  Match.when(ts.isTypeAliasDeclaration, typeAliasDeclarationKind),
  Match.orElse(enumDeclarationKind)
)

const optionalDeclarationName = (declaration: ts.FunctionDeclaration | ts.ClassDeclaration) =>
  Option.fromNullishOr(declaration.name)

const requiredDeclarationName = (
  declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration
) => Option.some(declaration.name)

const declarationName = pipe(
  Match.type<BasicDeclaration>(),
  Match.when(ts.isFunctionDeclaration, optionalDeclarationName),
  Match.when(ts.isClassDeclaration, optionalDeclarationName),
  Match.when(ts.isInterfaceDeclaration, requiredDeclarationName),
  Match.when(ts.isTypeAliasDeclaration, requiredDeclarationName),
  Match.orElse(requiredDeclarationName)
)

const toBasicDeclaration = Option.liftPredicate<BasicDeclaration>(Function.constTrue)

const noBasicDeclarationOption = Option.none<BasicDeclaration>()
const noBasicDeclaration = Function.constant(noBasicDeclarationOption)

const basicDeclaration = pipe(
  Match.type<ts.Statement>(),
  Match.when(ts.isFunctionDeclaration, toBasicDeclaration),
  Match.when(ts.isClassDeclaration, toBasicDeclaration),
  Match.when(ts.isInterfaceDeclaration, toBasicDeclaration),
  Match.when(ts.isTypeAliasDeclaration, toBasicDeclaration),
  Match.when(ts.isEnumDeclaration, toBasicDeclaration),
  Match.orElse(noBasicDeclaration)
)

const entityKey =
  (sourcePath: string) =>
  (declaration: BasicDeclaration): SemanticModuleEntityKey => {
    const start = declaration.getStart()
    const end = declaration.getEnd()

    const key = SemanticModuleEntityKey.make({
      path: sourcePath,
      start,
      end,
      syntaxKind: declaration.kind
    })

    return Object.freeze(key)
  }

const symbolBackedName =
  (checker: ts.TypeChecker) =>
  (name: ts.Identifier): Option.Option<ts.Identifier> =>
    pipe(checker.getSymbolAtLocation(name), Option.fromNullishOr, Option.as(name))

const entityRecord =
  (context: ProgramMatchContext, sourceFile: ts.SourceFile) =>
  (declaration: BasicDeclaration): Option.Option<SemanticModuleEntityRecord> => {
    const projectRelativePath = toRelativeFileName(context.projectRoot)(sourceFile.fileName)

    const sourcePath = pipe(
      projectRelativePath,
      toWorkspacePath(context.projectRoot, context.workspaceRoot)
    )

    const sourceFileIsTest = isTestSourceFile(context.workspaceRoot)(sourceFile)
    const stratum = sourceFileIsTest ? ("test" as const) : ("production" as const)

    const makeRecord = (name: ts.Identifier) => {
      const key = pipe(declaration, entityKey(sourcePath))
      const declarationAnchorValues = Array.of(key)
      const declarationAnchors = Object.freeze(declarationAnchorValues)
      const kind = declarationKind(declaration)

      const record = SemanticModuleEntityRecord.make({
        key,
        declarationAnchors,
        stratum,
        displayName: name.text,
        declarationKind: kind
      })

      return Object.freeze(record)
    }

    return pipe(
      declaration,
      declarationName,
      Option.flatMap(symbolBackedName(context.checker)),
      Option.map(makeRecord)
    )
  }

const entitiesInSource =
  (context: ProgramMatchContext) =>
  (sourceFile: ts.SourceFile): ReadonlyArray<SemanticModuleEntityRecord> => {
    const basicDeclarations = Array.flatMap(
      sourceFile.statements,
      flow(basicDeclaration, Option.toArray)
    )

    const toEntityRecords = flow(entityRecord(context, sourceFile), Option.toArray)

    return Array.flatMap(basicDeclarations, toEntityRecords)
  }

const singletonModule = (entity: SemanticModuleEntityRecord): SemanticModuleRecord => {
  const memberValues = Array.of(entity.key)
  const members = Object.freeze(memberValues)
  const record = SemanticModuleRecord.make({ members, forestBondKeys: emptyBondKeys })

  return Object.freeze(record)
}

const freezeEntityRecord = (entity: SemanticModuleEntityRecord) => {
  Array.forEach(entity.declarationAnchors, Object.freeze)
  Object.freeze(entity.declarationAnchors)
  Object.freeze(entity.key)

  return Object.freeze(entity)
}

const freezeModuleRecord = (module: SemanticModuleRecord) => {
  Array.forEach(module.members, Object.freeze)
  Object.freeze(module.members)
  Object.freeze(module.forestBondKeys)

  return Object.freeze(module)
}

const freezeSnapshot = (snapshot: SemanticModuleSnapshotV1) => {
  Array.forEach(snapshot.entities, freezeEntityRecord)
  Array.forEach(snapshot.modules, freezeModuleRecord)
  Object.freeze(snapshot.entities)
  Object.freeze(snapshot.modules)
  Object.freeze(snapshot.acceptedBonds)
  Object.freeze(snapshot.suppressedBonds)
  Object.freeze(snapshot.exclusions)

  return Object.freeze(snapshot)
}

export const buildSemanticModuleSnapshot = (
  context: ProgramMatchContext
): SemanticModuleSnapshotV1 => {
  const sortedEntities = pipe(
    context.sourceFiles,
    Array.flatMap(entitiesInSource(context)),
    Array.sort(entityRecordOrder)
  )

  const entities = Object.freeze(sortedEntities)
  const moduleValues = Array.map(entities, singletonModule)
  const modules = Object.freeze(moduleValues)

  const snapshot = SemanticModuleSnapshotV1.make({
    entities,
    modules,
    acceptedBonds: emptyAcceptedBonds,
    suppressedBonds: emptySuppressedBonds,
    exclusions: emptyExclusions
  })

  return freezeSnapshot(snapshot)
}

const entityKeyMatches = (expected: SemanticModuleEntityKey) => (actual: SemanticModuleEntityKey) =>
  entityKeyEquivalence(expected, actual)

const containsEntity = (key: SemanticModuleEntityKey) => (module: SemanticModuleRecord) =>
  Array.some(module.members, entityKeyMatches(key))

export const moduleFor = Function.dual<
  (
    key: SemanticModuleEntityKey
  ) => (snapshot: SemanticModuleSnapshotV1) => Option.Option<SemanticModuleRecord>,
  (
    snapshot: SemanticModuleSnapshotV1,
    key: SemanticModuleEntityKey
  ) => Option.Option<SemanticModuleRecord>
>(2, (snapshot, key) => pipe(snapshot.modules, Array.findFirst(containsEntity(key))))

const peersInModule = (key: SemanticModuleEntityKey) => (module: SemanticModuleRecord) => {
  const differsFromKey = Predicate.not(entityKeyMatches(key))
  const peers = Array.filter(module.members, differsFromKey)

  return Object.freeze(peers)
}

export const peersFor = Function.dual<
  (
    key: SemanticModuleEntityKey
  ) => (
    snapshot: SemanticModuleSnapshotV1
  ) => Option.Option<ReadonlyArray<SemanticModuleEntityKey>>,
  (
    snapshot: SemanticModuleSnapshotV1,
    key: SemanticModuleEntityKey
  ) => Option.Option<ReadonlyArray<SemanticModuleEntityKey>>
>(2, (snapshot, key) =>
  pipe(snapshot.modules, Array.findFirst(containsEntity(key)), Option.map(peersInModule(key)))
)

export const proofBetween = Function.dual<
  (
    left: SemanticModuleEntityKey,
    right: SemanticModuleEntityKey
  ) => (
    snapshot: SemanticModuleSnapshotV1
  ) => Option.Option<ReadonlyArray<SemanticModuleMembershipProofStep>>,
  (
    snapshot: SemanticModuleSnapshotV1,
    left: SemanticModuleEntityKey,
    right: SemanticModuleEntityKey
  ) => Option.Option<ReadonlyArray<SemanticModuleMembershipProofStep>>
>(3, (snapshot, left, right) =>
  pipe(
    snapshot,
    moduleFor(left),
    Option.filter(containsEntity(right)),
    Option.flatMap(() => {
      const sameEntity = entityKeyEquivalence(left, right)

      const proof = sameEntity
        ? Option.some(emptyProof)
        : Option.none<ReadonlyArray<SemanticModuleMembershipProofStep>>()

      return proof
    })
  )
)
