import {
  Array,
  Data,
  Equivalence,
  Function,
  HashMap,
  HashSet,
  Option,
  Order,
  Predicate,
  Result,
  Schema,
  Struct,
  Tuple,
  pipe,
  Match as EffectMatch
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { fileSubscriptions } from "../../matcher/fileSubscriptions.js"
import { FileTarget } from "../../matcher/fileTarget.js"
import { makeNodeMatch } from "../../matcher/makeNodeMatch.js"
import { makePositionMatch } from "../../matcher/makePositionMatch.js"
import type { Match as MatcherMatch } from "../../matcher/match.js"
import type { MatchContext } from "../../matcher/matchContext.js"
import { NodeTarget } from "../../matcher/nodeTarget.js"
import { PositionTarget } from "../../matcher/positionTarget.js"
import type { ProgramMatchContext } from "../../matcher/programMatchContext.js"
import { withProgramMatcherIndex } from "../../matcher/withProgramMatcherIndex.js"
import type { Target } from "../../matcher/workspaceTarget.js"
import { canonicalSymbol } from "../../support/canonicalSymbol.js"
import { toRelativeFileName } from "../../support/paths.js"
import { referenceKey } from "../../support/referenceKey.js"
import type { ReferenceKey } from "../../support/referenceKeyType.js"
import { resolvedSymbolAt } from "../../support/resolvedSymbolAt.js"
import { bindingIdentifiers } from "./bindingIdentifiers.js"
import { dedupeSymbols } from "./dedupeSymbols.js"
import { emptyDeclarations } from "./emptyDeclarations.js"
import { emptyBondKeyValues } from "./emptyBondKeyValues.js"
import { entityKeyEquivalence } from "./entityKeyEquivalence.js"
import { entityKeyOrder } from "./entityKeyOrder.js"
import { entityKeyToken } from "./entityKeyToken.js"
import type { EntityDeclaration } from "./entityDeclaration.js"
import { freezeBondKey } from "./freezeBondKey.js"
import { freezeEvidence } from "./freezeEvidence.js"
import { freeze } from "./freeze.js"
import { isTestSourceFile } from "./isTestPath.js"
import { isModuleDeclarationBody } from "./isModuleDeclarationBody.js"
import { nodeEquivalence } from "./nodeEquivalence.js"
import { peersFor } from "./peersFor.js"
import { portableKeyToken } from "./portableKeyToken.js"
import { semanticComponentOrder } from "./semanticComponentOrder.js"
import { sameSymbolOwnershipRuleId } from "./sameSymbolOwnershipRuleId.js"
import { SemanticModuleAcceptedBondRecord } from "./semanticModuleAcceptedBondRecord.js"
import { SemanticModuleBondKey } from "./semanticModuleBondKey.js"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { SemanticModuleEntityRecord } from "./semanticModuleEntityRecordSchema.js"
import type { SemanticModuleEvidence } from "./semanticModuleEvidence.js"
import { SemanticModuleExclusionRecord } from "./semanticModuleExclusionRecord.js"
import { SemanticModuleHardBondCandidate } from "./semanticModuleHardBondCandidate.js"
import type { SemanticModuleHardBondRule } from "./semanticModuleHardBondRule.js"
import type { SemanticModuleHardBondRuleCatalog } from "./semanticModuleHardBondRuleCatalog.js"
import { SemanticModulePlacementEntityRecord } from "./semanticModulePlacementEntityRecord.js"
import { MixedPhysicalModulePlacementData } from "./semanticModulePlacementMixedData.js"
import { SemanticModulePlacementModuleSlice } from "./semanticModulePlacementModuleSlice.js"
import { SplitSemanticModulePlacementData } from "./semanticModulePlacementSplitData.js"
import { SemanticModuleRecord } from "./semanticModuleRecord.js"
import { SemanticModuleReferenceGraph } from "./semanticModuleReferenceGraph.js"
import { moduleFor, proofBetween } from "./semanticModuleProofQueries.js"
import { SemanticModuleSnapshotV1 } from "./semanticModuleSnapshotV1.js"
import { SemanticModuleSuppressedBondRecord } from "./semanticModuleSuppressedBondRecord.js"
import { semanticReferenceKindSchema } from "./semanticReferenceKindSchema.js"
import { stringEquivalence } from "./stringEquivalence.js"
import { symbolEquivalence } from "./symbolEquivalence.js"
import { symbolForIdentifier } from "./symbolOwnsIdentifier.js"
import { symbolsForBindingName } from "./symbolsForBindingName.js"
import { symbolsForOptionalDeclaration } from "./defaultDeclarationSymbol.js"
import { symbolsForRequiredDeclaration } from "./symbolsForRequiredDeclaration.js"
import type { SemanticReferenceWitness } from "./semanticReferenceWitness.js"
import { semanticReferenceWitnessSchema } from "./semanticReferenceWitnessSchema.js"
import { toWorkspacePath } from "./toWorkspacePath.js"
import { uniqueSortedPaths } from "./uniqueSortedPaths.js"
import type { UnownedSemanticReferenceWitness } from "./unownedSemanticReferenceWitness.js"
import { unownedSemanticReferenceWitnessSchema } from "./unownedSemanticReferenceWitnessSchema.js"
import { variableSymbols } from "./variableSymbols.js"

const bondKeyLeftEquivalence: Equivalence.Equivalence<SemanticModuleBondKey> = Equivalence.mapInput(
  entityKeyEquivalence,
  Struct.get("left")
)

const bondKeyRightEquivalence: Equivalence.Equivalence<SemanticModuleBondKey> =
  Equivalence.mapInput(entityKeyEquivalence, Struct.get("right"))

const bondKeyRuleEquivalence: Equivalence.Equivalence<SemanticModuleBondKey> = Equivalence.mapInput(
  Equivalence.strictEqual<string>(),
  Struct.get("ruleId")
)

const bondKeyEvidenceEquivalence: Equivalence.Equivalence<SemanticModuleBondKey> =
  Equivalence.mapInput(Equivalence.strictEqual<string>(), Struct.get("evidenceKey"))

const bondKeyEquivalences = Array.make(
  bondKeyLeftEquivalence,
  bondKeyRightEquivalence,
  bondKeyRuleEquivalence,
  bondKeyEvidenceEquivalence
)

const bondKeyEquivalence = Equivalence.combineAll(bondKeyEquivalences)

const bondKeyLeftOrder: Order.Order<SemanticModuleBondKey> = Order.mapInput(
  entityKeyOrder,
  Struct.get("left")
)

const bondKeyRightOrder: Order.Order<SemanticModuleBondKey> = Order.mapInput(
  entityKeyOrder,
  Struct.get("right")
)

const bondKeyRuleOrder: Order.Order<SemanticModuleBondKey> = Order.mapInput(
  Order.String,
  Struct.get("ruleId")
)

const bondKeyEvidenceOrder: Order.Order<SemanticModuleBondKey> = Order.mapInput(
  Order.String,
  Struct.get("evidenceKey")
)

const bondKeyOrders = Array.make(
  bondKeyLeftOrder,
  bondKeyRightOrder,
  bondKeyRuleOrder,
  bondKeyEvidenceOrder
)

const bondKeyOrder = Order.combineAll(bondKeyOrders)

const emptySymbols: ReadonlyArray<ts.Symbol> = Array.empty()
const emptyIdentifierOption = Option.none<ts.Identifier>()
const noIdentifier = Function.constant(emptyIdentifierOption)

const optionalDeclarationName = (declaration: ts.FunctionDeclaration | ts.ClassDeclaration) =>
  Option.fromNullishOr(declaration.name)

const requiredDeclarationName = (
  declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration
) => Option.some(declaration.name)

const nestedDeclarationName = pipe(
  EffectMatch.type<ts.Statement>(),
  EffectMatch.when(ts.isFunctionDeclaration, optionalDeclarationName),
  EffectMatch.when(ts.isClassDeclaration, optionalDeclarationName),
  EffectMatch.when(ts.isInterfaceDeclaration, requiredDeclarationName),
  EffectMatch.when(ts.isTypeAliasDeclaration, requiredDeclarationName),
  EffectMatch.when(ts.isEnumDeclaration, requiredDeclarationName),
  EffectMatch.orElse(noIdentifier)
)

const symbolsForModule =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (declaration: ts.ModuleDeclaration | ts.NamespaceDeclaration): ReadonlyArray<ts.Symbol> => {
    const symbolAtName = pipe(
      declaration.name,
      Option.liftPredicate(ts.isIdentifier),
      Option.flatMap(symbolForIdentifier(checker)),
      Option.toArray
    )

    const symbolsForNestedStatement = (statement: ts.Statement): ReadonlyArray<ts.Symbol> => {
      if (ts.isVariableStatement(statement)) {
        const variableSymbol = Function.flow(
          Struct.get<ts.VariableDeclaration, "name">("name"),
          symbolsForBindingName(checker)
        )

        return Array.flatMap(statement.declarationList.declarations, variableSymbol)
      }

      if (ts.isModuleDeclaration(statement)) {
        return pipe(statement, symbolsForModule(checker)(sourceFile))
      }

      return pipe(
        statement,
        nestedDeclarationName,
        Option.flatMap(symbolForIdentifier(checker)),
        Option.toArray
      )
    }

    const symbolsInModuleBlock = Function.flow(
      Struct.get<ts.ModuleBlock, "statements">("statements"),
      Array.flatMap(symbolsForNestedStatement)
    )

    const symbolsForBody = pipe(
      EffectMatch.type<ts.ModuleBody>(),
      EffectMatch.when(ts.isModuleBlock, symbolsInModuleBlock),
      EffectMatch.when(isModuleDeclarationBody, symbolsForModule(checker)(sourceFile)),
      EffectMatch.orElse(Function.constant(emptySymbols))
    )

    const symbolsInBody = pipe(
      declaration.body,
      Option.fromNullishOr,
      Option.map(symbolsForBody),
      Option.getOrElse(Function.constant(emptySymbols))
    )

    const symbols = Array.appendAll(symbolAtName, symbolsInBody)

    return dedupeSymbols(symbols)
  }

const symbolsForDeclaration =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (declaration: EntityDeclaration): ReadonlyArray<ts.Symbol> =>
    pipe(
      EffectMatch.value(declaration),
      EffectMatch.when(ts.isVariableDeclaration, variableSymbols(checker)),
      EffectMatch.when(ts.isModuleDeclaration, symbolsForModule(checker)(sourceFile)),
      EffectMatch.when(
        ts.isFunctionDeclaration,
        symbolsForOptionalDeclaration(checker)(sourceFile)
      ),
      EffectMatch.when(ts.isClassDeclaration, symbolsForOptionalDeclaration(checker)(sourceFile)),
      EffectMatch.when(ts.isInterfaceDeclaration, symbolsForRequiredDeclaration(checker)),
      EffectMatch.when(ts.isTypeAliasDeclaration, symbolsForRequiredDeclaration(checker)),
      EffectMatch.when(ts.isEnumDeclaration, symbolsForRequiredDeclaration(checker)),
      EffectMatch.exhaustive
    )

// EntityCandidate keeps compiler ownership private because Symbols cannot cross the snapshot seam.
class EntityCandidate extends Data.Class<{
  readonly declarations: ReadonlyArray<EntityDeclaration>
  readonly ownedSymbols: ReadonlyArray<ts.Symbol>
  readonly bondSymbols: ReadonlyArray<ts.Symbol>
}> {}

// OwnedEntity keeps compiler ownership private because Symbols cannot cross snapshot JSON.
class OwnedEntity extends Data.Class<{
  readonly record: SemanticModuleEntityRecord
  readonly declarations: ReadonlyArray<EntityDeclaration>
  readonly ownedSymbols: ReadonlyArray<ts.Symbol>
  readonly bondSymbols: ReadonlyArray<ts.Symbol>
}> {}

// BondRecord is the shared freeze shape because accepted and suppressed bonds share fields.
type BondRecord = {
  readonly key: SemanticModuleBondKey
  readonly evidence: SemanticModuleEvidence
}

const freezeBondRecord = <A extends BondRecord>(bond: A): A => {
  freezeBondKey(bond.key)
  freezeEvidence(bond.evidence)

  return Object.freeze(bond)
}

const orderedEntityKeys = (
  left: SemanticModuleEntityKey,
  right: SemanticModuleEntityKey
): readonly [SemanticModuleEntityKey, SemanticModuleEntityKey] =>
  Order.isLessThan(entityKeyOrder)(left, right) ? Tuple.make(left, right) : Tuple.make(right, left)

const placementDataMembers = Array.make(
  SplitSemanticModulePlacementData,
  MixedPhysicalModulePlacementData
)

// Placement data is a tagged union because split and mixed projections share one Signal.
export const SemanticModulePlacementData = Schema.Union(placementDataMembers)

export type SemanticModulePlacementData = Schema.Schema.Type<typeof SemanticModulePlacementData>

const moduleFirstMember = (module: SemanticModuleRecord): SemanticModuleEntityKey =>
  pipe(module.members, Array.head, Option.getOrThrow)

const physicalPathsForMembers = (
  members: ReadonlyArray<SemanticModuleEntityKey>
): ReadonlyArray<string> => pipe(members, Array.map(Struct.get("path")), uniqueSortedPaths)

const workspacePathOf = (context: ProgramMatchContext) => (sourceFile: ts.SourceFile) =>
  pipe(
    toRelativeFileName(context.projectRoot)(sourceFile.fileName),
    toWorkspacePath(context.projectRoot, context.workspaceRoot)
  )

const sourceFileHasWorkspacePath =
  (context: ProgramMatchContext) => (workspacePath: string) => (sourceFile: ts.SourceFile) => {
    const sourceWorkspacePath = workspacePathOf(context)(sourceFile)
    return stringEquivalence(sourceWorkspacePath, workspacePath)
  }

const sourceFileByWorkspacePath = (context: ProgramMatchContext) => (workspacePath: string) =>
  Array.findFirst(context.sourceFiles, sourceFileHasWorkspacePath(context)(workspacePath))

// SemanticReferenceKind aliases the kind schema because witnesses share one closed set.
type SemanticReferenceKind = Schema.Schema.Type<typeof semanticReferenceKindSchema>
const sameSymbolEvidenceRule = Schema.Literal(sameSymbolOwnershipRuleId)

// SameSymbolEvidence is closed because bond keys retain only reusable ownership semantics.
const SameSymbolEvidence = Schema.Struct({
  ruleId: sameSymbolEvidenceRule,
  left: SemanticModuleEntityKey,
  right: SemanticModuleEntityKey
})

// SameSymbolEvidence keeps decoded endpoints typed because validation and freezing share them.
interface SameSymbolEvidence extends Schema.Schema.Type<typeof SameSymbolEvidence> {}

// semanticModuleEngine owns snapshot/placement because bonds and graph share one pipeline.
const createSemanticModuleEngine = () => {
  // --- collocated helpers (private) --- nested because the semantic module is one physical module.

  const declarationKeyPart = (declaration: ts.Declaration) => {
    const sourcePath = declaration.getSourceFile().fileName.replaceAll("\\", "/")
    const startToken = String(declaration.pos)
    const endToken = String(declaration.end)
    const kindToken = String(declaration.kind)
    const parts = Array.make(sourcePath, startToken, endToken, kindToken)
    return Array.join(parts, "\x00")
  }

  const declarationOwnershipKey = (symbol: ts.Symbol) => {
    const declarations = symbol.declarations ?? emptyDeclarations
    const parts = Array.map(declarations, declarationKeyPart)
    const ordered = Array.sort(parts, Order.String)
    return Array.join(ordered, "\x01")
  }

  const entityKey =
    (sourcePath: string) =>
    (declaration: EntityDeclaration): SemanticModuleEntityKey => {
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

  const rootOfParentMap =
    (parent: HashMap.HashMap<string, string>) =>
    (token: string): string => {
      const parentToken = pipe(
        HashMap.get(parent, token),
        Option.getOrElse(Function.constant(token))
      )

      const isRoot = strictEqual(parentToken)(token)
      return isRoot ? token : rootOfParentMap(parent)(parentToken)
    }

  const freezeEntityRecord = (entity: SemanticModuleEntityRecord) => {
    Array.forEach(entity.declarationAnchors, Object.freeze)
    Object.freeze(entity.declarationAnchors)
    Object.freeze(entity.key)

    return Object.freeze(entity)
  }

  const freezeModuleRecord = (module: SemanticModuleRecord) => {
    Array.forEach(module.members, Object.freeze)
    Array.forEach(module.forestBondKeys, freezeBondKey)
    Object.freeze(module.members)
    Object.freeze(module.forestBondKeys)

    return Object.freeze(module)
  }

  const makeBondKey = (
    left: SemanticModuleEntityKey,
    right: SemanticModuleEntityKey,
    ruleId: string,
    evidenceKey: string
  ) => {
    const endpoints = orderedEntityKeys(left, right)
    const orderedLeft = Tuple.get(endpoints, 0)
    const orderedRight = Tuple.get(endpoints, 1)

    return SemanticModuleBondKey.make({
      left: orderedLeft,
      right: orderedRight,
      ruleId,
      evidenceKey
    })
  }

  const isAliasSymbol = (symbol: ts.Symbol) =>
    Predicate.not(strictEqual(0))(symbol.flags & ts.SymbolFlags.Alias)

  const isBondableSymbol = (symbol: ts.Symbol) => {
    const notAlias = Predicate.not(isAliasSymbol)(symbol)
    const declarations = symbol.declarations ?? Array.empty()
    const hasDeclarations = Predicate.not(strictEqual(0))(declarations.length)
    const bondableReasons = Array.make(notAlias, hasDeclarations)

    return Array.every(bondableReasons, Function.identity)
  }

  const bondSymbolsFor =
    (checker: ts.TypeChecker) =>
    (symbols: ReadonlyArray<ts.Symbol>): ReadonlyArray<ts.Symbol> =>
      pipe(
        symbols,
        Array.map(canonicalSymbol(checker)),
        Array.filter(isBondableSymbol),
        dedupeSymbols
      )

  const isOptionalNamedDeclaration = (
    declaration: EntityDeclaration
  ): declaration is ts.FunctionDeclaration | ts.ClassDeclaration =>
    ts.isFunctionDeclaration(declaration) || ts.isClassDeclaration(declaration)

  const moduleDeclarationBondSymbols =
    (checker: ts.TypeChecker) =>
    (declaration: ts.ModuleDeclaration): ReadonlyArray<ts.Symbol> =>
      pipe(
        declaration.name,
        Option.liftPredicate(ts.isIdentifier),
        Option.flatMap(symbolForIdentifier(checker)),
        Option.toArray
      )

  const declarationNameBondSymbols =
    (checker: ts.TypeChecker) =>
    (sourceFile: ts.SourceFile) =>
    (declaration: EntityDeclaration): ReadonlyArray<ts.Symbol> => {
      if (ts.isVariableDeclaration(declaration)) {
        return variableSymbols(checker)(declaration)
      }

      if (ts.isModuleDeclaration(declaration)) {
        return moduleDeclarationBondSymbols(checker)(declaration)
      }

      return isOptionalNamedDeclaration(declaration)
        ? symbolsForOptionalDeclaration(checker)(sourceFile)(declaration)
        : symbolsForRequiredDeclaration(checker)(declaration)
    }

  const makeCandidate =
    (checker: ts.TypeChecker) =>
    (sourceFile: ts.SourceFile) =>
    (declarations: ReadonlyArray<EntityDeclaration>): EntityCandidate => {
      const symbols = pipe(
        declarations,
        Array.flatMap(symbolsForDeclaration(checker)(sourceFile)),
        dedupeSymbols
      )

      const nameSymbols = pipe(
        declarations,
        Array.flatMap(declarationNameBondSymbols(checker)(sourceFile)),
        dedupeSymbols
      )

      const ownedSymbols = Object.freeze(symbols)
      const bondSymbolList = bondSymbolsFor(checker)(nameSymbols)
      const bondSymbols = Object.freeze(bondSymbolList)

      return new EntityCandidate({ declarations, ownedSymbols, bondSymbols })
    }

  const namedNodeEquals =
    (identifier: ts.Identifier) =>
    (name: Option.Option<ts.Node>): boolean => {
      const matchesIdentifier = (node: ts.Node) => nodeEquivalence(node, identifier)
      return pipe(name, Option.exists(matchesIdentifier))
    }

  const ownedEntityRecord = Struct.get<OwnedEntity, "record">("record")

  // Raw bond candidates reuse accepted-bond shape because partition only needs key+evidence.
  const rawBondKeyEquivalence: Equivalence.Equivalence<SemanticModuleAcceptedBondRecord> =
    Equivalence.mapInput(bondKeyEquivalence, Struct.get("key"))

  const rawBondOrder: Order.Order<SemanticModuleAcceptedBondRecord> = Order.mapInput(
    bondKeyOrder,
    Struct.get("key")
  )

  const entityKeyPathOrder: Order.Order<SemanticModuleEntityKey> = Order.mapInput(
    Order.String,
    Struct.get("path")
  )

  const entityKeyStartOrder: Order.Order<SemanticModuleEntityKey> = Order.mapInput(
    Order.Number,
    Struct.get("start")
  )

  const entityKeyEndOrder: Order.Order<SemanticModuleEntityKey> = Order.mapInput(
    Order.Number,
    Struct.get("end")
  )

  const entityKeyKindOrder: Order.Order<SemanticModuleEntityKey> = Order.mapInput(
    Order.Number,
    Struct.get("syntaxKind")
  )

  const entityKeyOrders = Array.make(
    entityKeyPathOrder,
    entityKeyStartOrder,
    entityKeyEndOrder,
    entityKeyKindOrder
  )

  const entityKeyOrder = Order.combineAll(entityKeyOrders)
  const moduleOrder = Order.mapInput(entityKeyOrder, moduleFirstMember)

  // PlacementIndex groups placement matches by file because matcher subscribe is file-local.
  class PlacementIndex {
    constructor(
      readonly snapshot: SemanticModuleSnapshotV1,
      readonly matchesByFile: HashMap.HashMap<
        string,
        ReadonlyArray<MatcherMatch<SemanticModulePlacementData>>
      >
    ) {}
  }

  const entityKeyEquals =
    (expected: SemanticModuleEntityKey) => (actual: SemanticModuleEntityKey) =>
      entityKeyEquivalence(expected, actual)

  const entityHasKey = (key: SemanticModuleEntityKey) => (entity: SemanticModuleEntityRecord) =>
    pipe(entity.key, entityKeyEquals(key))

  const entityRecordByKey =
    (entities: ReadonlyArray<SemanticModuleEntityRecord>) =>
    (key: SemanticModuleEntityKey): Option.Option<SemanticModuleEntityRecord> =>
      Array.findFirst(entities, entityHasKey(key))

  const bondKeyLeftEqual = (
    left: SemanticModuleAcceptedBondRecord["key"],
    right: SemanticModuleAcceptedBondRecord["key"]
  ) => entityKeyEquivalence(left.left, right.left)

  const bondKeyRightEqual = (
    left: SemanticModuleAcceptedBondRecord["key"],
    right: SemanticModuleAcceptedBondRecord["key"]
  ) => entityKeyEquivalence(left.right, right.right)

  const bondKeyRuleEqual = (
    left: SemanticModuleAcceptedBondRecord["key"],
    right: SemanticModuleAcceptedBondRecord["key"]
  ) => stringEquivalence(left.ruleId, right.ruleId)

  const bondKeyEvidenceEqual = (
    left: SemanticModuleAcceptedBondRecord["key"],
    right: SemanticModuleAcceptedBondRecord["key"]
  ) => stringEquivalence(left.evidenceKey, right.evidenceKey)

  const bondKeysEqual = (
    left: SemanticModuleAcceptedBondRecord["key"],
    right: SemanticModuleAcceptedBondRecord["key"]
  ) => {
    const leftEqual = bondKeyLeftEqual(left, right)
    const rightEqual = bondKeyRightEqual(left, right)
    const ruleEqual = bondKeyRuleEqual(left, right)
    const evidenceEqual = bondKeyEvidenceEqual(left, right)
    const sidesEqual = leftEqual && rightEqual
    const metaEqual = ruleEqual && evidenceEqual

    return sidesEqual && metaEqual
  }

  const bondHasKey =
    (key: SemanticModuleAcceptedBondRecord["key"]) => (bond: SemanticModuleAcceptedBondRecord) =>
      bondKeysEqual(key, bond.key)

  const acceptedBondForKey =
    (acceptedBonds: ReadonlyArray<SemanticModuleAcceptedBondRecord>) =>
    (key: SemanticModuleAcceptedBondRecord["key"]) =>
      pipe(Array.findFirst(acceptedBonds, bondHasKey(key)), Result.fromOption(Function.constVoid))

  const entityRecordResultForKey =
    (entitiesByKey: (key: SemanticModuleEntityKey) => Option.Option<SemanticModuleEntityRecord>) =>
    (key: SemanticModuleEntityKey) =>
      pipe(entitiesByKey(key), Result.fromOption(Function.constVoid))

  const entitiesForMembers =
    (entitiesByKey: (key: SemanticModuleEntityKey) => Option.Option<SemanticModuleEntityRecord>) =>
    (members: ReadonlyArray<SemanticModuleEntityKey>): ReadonlyArray<SemanticModuleEntityRecord> =>
      pipe(members, Array.filterMap(entityRecordResultForKey(entitiesByKey)), freeze)

  const forestBondsForModule =
    (acceptedBonds: ReadonlyArray<SemanticModuleAcceptedBondRecord>) =>
    (module: SemanticModuleRecord): ReadonlyArray<SemanticModuleAcceptedBondRecord> =>
      pipe(module.forestBondKeys, Array.filterMap(acceptedBondForKey(acceptedBonds)), freeze)

  const oneBasedLocation = (sourceFile: ts.SourceFile, start: number) => {
    const position = sourceFile.getLineAndCharacterOfPosition(start)
    const line = position.line + 1
    const column = position.character + 1
    const location = { line, column }
    return location
  }

  const placementEntityWithSourceFile =
    (entity: SemanticModuleEntityRecord) =>
    (sourceFile: ts.SourceFile): SemanticModulePlacementEntityRecord => {
      const position = oneBasedLocation(sourceFile, entity.key.start)

      return SemanticModulePlacementEntityRecord.make({
        ...entity,
        line: position.line,
        column: position.column
      })
    }

  const placementEntityFor =
    (context: ProgramMatchContext) =>
    (entity: SemanticModuleEntityRecord): SemanticModulePlacementEntityRecord => {
      const sourceFileOption = sourceFileByWorkspacePath(context)(entity.key.path)

      const fallback = SemanticModulePlacementEntityRecord.make({
        ...entity,
        line: 1,
        column: 1
      })

      return pipe(
        sourceFileOption,
        Option.map(placementEntityWithSourceFile(entity)),
        Option.getOrElse(Function.constant(fallback)),
        freeze
      )
    }

  const freezeSliceFields = (slice: SemanticModulePlacementModuleSlice) => {
    Object.freeze(slice.entities)
    Object.freeze(slice.physicalModulePaths)
    Object.freeze(slice.forestBonds)

    return Object.freeze(slice)
  }

  const sliceForModule =
    (context: ProgramMatchContext) =>
    (snapshot: SemanticModuleSnapshotV1) =>
    (module: SemanticModuleRecord): SemanticModulePlacementModuleSlice => {
      const entitiesByKey = entityRecordByKey(snapshot.entities)
      const snapshotEntities = entitiesForMembers(entitiesByKey)(module.members)
      const entities = pipe(snapshotEntities, Array.map(placementEntityFor(context)), freeze)
      const physicalModulePaths = physicalPathsForMembers(module.members)
      const forestBonds = forestBondsForModule(snapshot.acceptedBonds)(module)

      const slice = SemanticModulePlacementModuleSlice.make({
        entities,
        physicalModulePaths,
        forestBonds
      })

      return freezeSliceFields(slice)
    }

  const singletonEntityDeclaration = Array.of<EntityDeclaration>

  // SourceNormalization separates outputs because entities and exclusions order independently.
  class SourceNormalization extends Data.Class<{
    readonly entities: ReadonlyArray<OwnedEntity>
    readonly exclusions: ReadonlyArray<SemanticModuleExclusionRecord>
  }> {}

  // SymbolOwners groups entities by symbol because same-symbol bonds pair multi-owner symbols.
  class SymbolOwners extends Data.Class<{
    readonly symbol: ts.Symbol
    readonly owners: ReadonlyArray<SemanticModuleEntityKey>
  }> {}

  // TarjanState is SCC scratch state because component discovery threads index and stack.
  class TarjanState extends Data.Class<{
    readonly nextIndex: number
    readonly indices: HashMap.HashMap<string, number>
    readonly lowLinks: HashMap.HashMap<string, number>
    readonly stack: ReadonlyArray<string>
    readonly onStack: HashSet.HashSet<string>
    readonly components: ReadonlyArray<ReadonlyArray<SemanticModuleEntityKey>>
  }> {}

  // --- freezeSemanticModuleSnapshot --- freezes graphs because snapshots must be immutable.
  const freezeExclusionRecord = (exclusion: SemanticModuleExclusionRecord) => {
    Object.freeze(exclusion.anchor)

    return Object.freeze(exclusion)
  }

  const freezeSnapshot = (snapshot: SemanticModuleSnapshotV1) => {
    Array.forEach(snapshot.entities, freezeEntityRecord)
    Array.forEach(snapshot.modules, freezeModuleRecord)
    Array.forEach(snapshot.acceptedBonds, freezeBondRecord)
    Array.forEach(snapshot.suppressedBonds, freezeBondRecord)
    Array.forEach(snapshot.exclusions, freezeExclusionRecord)
    Object.freeze(snapshot.entities)
    Object.freeze(snapshot.modules)
    Object.freeze(snapshot.acceptedBonds)
    Object.freeze(snapshot.suppressedBonds)
    Object.freeze(snapshot.exclusions)

    return Object.freeze(snapshot)
  }

  // PartitionState is union-find state because accepted bonds define ownership forests.
  class PartitionState extends Data.Class<{
    readonly parent: HashMap.HashMap<string, string>
    readonly forestByRoot: HashMap.HashMap<string, ReadonlyArray<SemanticModuleBondKey>>
  }> {}

  const makeInitialPartitionState = (entities: ReadonlyArray<SemanticModuleEntityRecord>) => {
    const parentEntries = Array.map(entities, (entity) => {
      const token = entityKeyToken(entity.key)

      return Tuple.make(token, token)
    })

    const parentMap = HashMap.fromIterable(parentEntries)
    const emptyForestByRoot = HashMap.empty<string, ReadonlyArray<SemanticModuleBondKey>>()
    return new PartitionState({
      parent: parentMap,
      forestByRoot: emptyForestByRoot
    })
  }

  const unionAcceptedBond = (state: PartitionState, bond: SemanticModuleAcceptedBondRecord) => {
    const leftToken = entityKeyToken(bond.key.left)
    const rightToken = entityKeyToken(bond.key.right)
    const leftRoot = rootOfParentMap(state.parent)(leftToken)
    const rightRoot = rootOfParentMap(state.parent)(rightToken)

    if (strictEqual(leftRoot)(rightRoot)) {
      return state
    }

    const keepRoot = leftRoot < rightRoot ? leftRoot : rightRoot
    const dropRoot = leftRoot < rightRoot ? rightRoot : leftRoot
    const parent = HashMap.set(state.parent, dropRoot, keepRoot)

    const keepForest = pipe(
      HashMap.get(state.forestByRoot, keepRoot),
      Option.getOrElse(Function.constant(emptyBondKeyValues))
    )

    const dropForest = pipe(
      HashMap.get(state.forestByRoot, dropRoot),
      Option.getOrElse(Function.constant(emptyBondKeyValues))
    )

    const mergedForest = pipe(
      Array.appendAll(keepForest, dropForest),
      Array.append(bond.key),
      Array.sort(bondKeyOrder)
    )

    const forestWithoutDrop = HashMap.remove(state.forestByRoot, dropRoot)
    const forestByRoot = HashMap.set(forestWithoutDrop, keepRoot, mergedForest)

    return new PartitionState({ parent, forestByRoot })
  }

  const firstModuleMember = (module: SemanticModuleRecord) =>
    pipe(module.members, Array.head, Option.getOrThrow)

  const moduleFirstMemberOrder = Order.mapInput(entityKeyOrder, firstModuleMember)

  const materializeModules =
    (entities: ReadonlyArray<SemanticModuleEntityRecord>) =>
    (state: PartitionState): ReadonlyArray<SemanticModuleRecord> => {
      const emptyGroups = HashMap.empty<string, ReadonlyArray<SemanticModuleEntityKey>>()

      const addMember = (
        groups: HashMap.HashMap<string, ReadonlyArray<SemanticModuleEntityKey>>,
        entity: SemanticModuleEntityRecord
      ) => {
        const token = entityKeyToken(entity.key)
        const root = rootOfParentMap(state.parent)(token)
        const members = pipe(HashMap.get(groups, root), Option.getOrElse(Array.empty))
        const nextMembers = Array.append(members, entity.key)
        return HashMap.set(groups, root, nextMembers)
      }

      const groups = Array.reduce(entities, emptyGroups, addMember)

      const makeModuleForGroup = (
        entry: readonly [string, ReadonlyArray<SemanticModuleEntityKey>]
      ): SemanticModuleRecord => {
        const root = Tuple.get(entry, 0)
        const memberKeys = Tuple.get(entry, 1)
        const sortedMembers = Array.sort(memberKeys, entityKeyOrder)
        const members = Object.freeze(sortedMembers)

        const sortedForest = pipe(
          HashMap.get(state.forestByRoot, root),
          Option.getOrElse(Function.constant(emptyBondKeyValues)),
          Array.sort(bondKeyOrder)
        )

        const forestBondKeys = Object.freeze(sortedForest)

        return SemanticModuleRecord.make({ members, forestBondKeys })
      }

      return pipe(
        HashMap.toEntries(groups),
        Array.map(makeModuleForGroup),
        Array.sort(moduleFirstMemberOrder)
      )
    }

  const closeModules =
    (entities: ReadonlyArray<SemanticModuleEntityRecord>) =>
    (
      acceptedBonds: ReadonlyArray<SemanticModuleAcceptedBondRecord>
    ): ReadonlyArray<SemanticModuleRecord> => {
      const initialPartition = makeInitialPartitionState(entities)
      const state = Array.reduce(acceptedBonds, initialPartition, unionAcceptedBond)

      return materializeModules(entities)(state)
    }

  // --- sameSymbolBondCandidates --- pairs multi-owner symbols because ownership is shared.
  const ownedEntityBondSymbols = Struct.get<OwnedEntity, "bondSymbols">("bondSymbols")
  const decodeSameSymbolEvidence = Schema.decodeUnknownSync(SameSymbolEvidence)

  const sameSymbolEvidenceKey = (
    leftKey: SemanticModuleEntityKey,
    rightKey: SemanticModuleEntityKey,
    symbolName: string
  ) => {
    const leftStart = String(leftKey.start)
    const leftEnd = String(leftKey.end)
    const leftKind = String(leftKey.syntaxKind)
    const rightStart = String(rightKey.start)
    const rightEnd = String(rightKey.end)
    const rightKind = String(rightKey.syntaxKind)

    const tokens = Array.make(
      sameSymbolOwnershipRuleId,
      "1",
      symbolName,
      leftKey.path,
      leftStart,
      leftEnd,
      leftKind,
      rightKey.path,
      rightStart,
      rightEnd,
      rightKind
    )

    return Array.join(tokens, "")
  }

  const sameSymbolEvidence = (
    left: SemanticModuleEntityKey,
    right: SemanticModuleEntityKey
  ): SemanticModuleEvidence => {
    const endpoints = orderedEntityKeys(left, right)
    const orderedLeft = Tuple.get(endpoints, 0)
    const orderedRight = Tuple.get(endpoints, 1)

    const evidence = decodeSameSymbolEvidence({
      ruleId: sameSymbolOwnershipRuleId,
      left: orderedLeft,
      right: orderedRight
    })

    return freezeEvidence(evidence)
  }

  const pairwiseOwnerBonds = (
    entry: SymbolOwners
  ): ReadonlyArray<SemanticModuleAcceptedBondRecord> => {
    const sortedOwners = Array.sort(entry.owners, entityKeyOrder)

    return Array.flatMap(sortedOwners, (left, index) => {
      const rights = Array.drop(sortedOwners, index + 1)

      return Array.map(rights, (right) => {
        const symbolName = entry.symbol.getName()
        const evidenceKey = sameSymbolEvidenceKey(left, right, symbolName)
        const key = makeBondKey(left, right, sameSymbolOwnershipRuleId, evidenceKey)
        const evidence = sameSymbolEvidence(left, right)

        return SemanticModuleAcceptedBondRecord.make({ key, evidence })
      })
    })
  }

  const emptyOwnersList = Array.empty<SemanticModuleEntityKey>()

  const appendSymbolOwner =
    (entityKeyValue: SemanticModuleEntityKey) =>
    (
      ownersBySymbol: HashMap.HashMap<ReferenceKey, SymbolOwners>,
      symbol: ts.Symbol
    ): HashMap.HashMap<ReferenceKey, SymbolOwners> => {
      const symbolKey = referenceKey(symbol)

      const existing = pipe(
        HashMap.get(ownersBySymbol, symbolKey),
        Option.getOrElse(() => {
          const emptyOwners = new SymbolOwners({
            symbol,
            owners: emptyOwnersList
          })

          return emptyOwners
        })
      )

      const withOwner = Array.append(existing.owners, entityKeyValue)
      const uniqueOwners = Array.dedupeWith(withOwner, entityKeyEquivalence)

      const nextOwnersRecord = new SymbolOwners({
        symbol: existing.symbol,
        owners: uniqueOwners
      })

      return HashMap.set(ownersBySymbol, symbolKey, nextOwnersRecord)
    }

  const indexOwnedEntity = (
    ownersBySymbol: HashMap.HashMap<ReferenceKey, SymbolOwners>,
    owned: OwnedEntity
  ) => {
    const bondSymbols = ownedEntityBondSymbols(owned)
    const ownerKey = ownedEntityRecord(owned).key
    return Array.reduce(bondSymbols, ownersBySymbol, appendSymbolOwner(ownerKey))
  }

  const sameSymbolCandidates = (
    ownedEntities: ReadonlyArray<OwnedEntity>
  ): ReadonlyArray<SemanticModuleAcceptedBondRecord> => {
    const emptyOwners = HashMap.empty<ReferenceKey, SymbolOwners>()
    const ownersBySymbol = Array.reduce(ownedEntities, emptyOwners, indexOwnedEntity)
    const symbolOwnerEntries = HashMap.toEntries(ownersBySymbol)
    const ownerEntry = (entry: readonly [ReferenceKey, SymbolOwners]) => Tuple.get(entry, 1)

    const multiOwnerEntries = pipe(
      symbolOwnerEntries,
      Array.map(ownerEntry),
      Array.filter((entry) => entry.owners.length > 1)
    )

    return pipe(
      multiOwnerEntries,
      Array.flatMap(pairwiseOwnerBonds),
      Array.sort(rawBondOrder),
      Array.dedupeWith(rawBondKeyEquivalence)
    )
  }

  // --- semanticComponentsFromReferences --- finds SCCs because cycles force hard bonds.
  const emptyTokenAdjacency = HashMap.empty<string, ReadonlyArray<string>>()

  const appendUniqueTarget =
    (targetToken: string) =>
    (targets: ReadonlyArray<string>): ReadonlyArray<string> =>
      Array.contains(targets, targetToken) ? targets : Array.append(targets, targetToken)

  const addReferenceEdge =
    (reference: SemanticReferenceWitness) =>
    (adjacency: HashMap.HashMap<string, ReadonlyArray<string>>) => {
      const consumerToken = portableKeyToken(reference.consumer)
      const targetToken = portableKeyToken(reference.target)
      const existing = pipe(HashMap.get(adjacency, consumerToken), Option.getOrElse(Array.empty))
      const nextTargets = appendUniqueTarget(targetToken)(existing)
      return HashMap.set(adjacency, consumerToken, nextTargets)
    }

  const tokenOrder = (nodeByToken: HashMap.HashMap<string, SemanticModuleEntityKey>) => {
    const keyForToken = (token: string) => pipe(HashMap.get(nodeByToken, token), Option.getOrThrow)
    return Order.mapInput(entityKeyOrder, keyForToken)
  }

  const sortAdjacencyTargets =
    (nodeByToken: HashMap.HashMap<string, SemanticModuleEntityKey>) =>
    (
      adjacency: HashMap.HashMap<string, ReadonlyArray<string>>
    ): HashMap.HashMap<string, ReadonlyArray<string>> => {
      const order = tokenOrder(nodeByToken)
      const sortTargets = (targets: ReadonlyArray<string>) => Array.sort(targets, order)

      return HashMap.map(adjacency, sortTargets)
    }

  const emptyTarjanIndices = HashMap.empty<string, number>()
  const emptyTarjanLowLinks = HashMap.empty<string, number>()
  const emptyTarjanStack = Array.empty<string>()
  const emptyTarjanOnStack = HashSet.empty<string>()
  const emptyTarjanComponents = Array.empty<ReadonlyArray<SemanticModuleEntityKey>>()

  const initialTarjanState = new TarjanState({
    nextIndex: 0,
    indices: emptyTarjanIndices,
    lowLinks: emptyTarjanLowLinks,
    stack: emptyTarjanStack,
    onStack: emptyTarjanOnStack,
    components: emptyTarjanComponents
  })

  const withLowLink = (token: string, lowLink: number) => (state: TarjanState) => {
    const nextLowLinks = HashMap.set(state.lowLinks, token, lowLink)
    return new TarjanState({
      ...state,
      lowLinks: nextLowLinks
    })
  }

  const lowLinkOf =
    (token: string) =>
    (fallback: number) =>
    (state: TarjanState): number =>
      pipe(HashMap.get(state.lowLinks, token), Option.getOrElse(Function.constant(fallback)))

  const tarjanIndexOf =
    (token: string) =>
    (fallback: number) =>
    (state: TarjanState): number =>
      pipe(HashMap.get(state.indices, token), Option.getOrElse(Function.constant(fallback)))

  const splitStack =
    (rootToken: string) =>
    (
      stack: ReadonlyArray<string>,
      acc: ReadonlyArray<string>
    ): readonly [ReadonlyArray<string>, ReadonlyArray<string>] => {
      const reversed = Array.reverse(stack)
      const head = Array.head(reversed)
      const rest = Array.dropRight(stack, 1)

      return pipe(
        head,
        Option.match({
          onNone: () => {
            const emptyLeft = Array.empty<string>()
            const noneSplit = Tuple.make(emptyLeft, acc)
            return noneSplit
          },
          onSome: (memberToken) => {
            const nextAcc = Array.append(acc, memberToken)

            return strictEqual(memberToken)(rootToken)
              ? Tuple.make(rest, nextAcc)
              : splitStack(rootToken)(rest, nextAcc)
          }
        })
      )
    }

  const connectToken =
    (
      adjacency: HashMap.HashMap<string, ReadonlyArray<string>>,
      nodeByToken: HashMap.HashMap<string, SemanticModuleEntityKey>
    ) =>
    (token: string) =>
    (state: TarjanState): TarjanState => {
      if (HashMap.has(state.indices, token)) {
        return state
      }

      const nextIndex = state.nextIndex + 1
      const nextIndices = HashMap.set(state.indices, token, state.nextIndex)
      const nextLowLinks = HashMap.set(state.lowLinks, token, state.nextIndex)
      const nextStack = Array.append(state.stack, token)
      const nextOnStack = HashSet.add(state.onStack, token)

      const indexed = new TarjanState({
        nextIndex,
        indices: nextIndices,
        lowLinks: nextLowLinks,
        stack: nextStack,
        onStack: nextOnStack,
        components: state.components
      })

      const targets = pipe(HashMap.get(adjacency, token), Option.getOrElse(Array.empty))

      const afterTargets = Array.reduce(targets, indexed, (current, target) => {
        if (!HashMap.has(current.indices, target)) {
          const descended = connectToken(adjacency, nodeByToken)(target)(current)
          const tokenLow = lowLinkOf(token)(state.nextIndex)(descended)
          const targetLow = lowLinkOf(target)(0)(descended)
          const nextLow = Math.min(tokenLow, targetLow)
          return withLowLink(token, nextLow)(descended)
        }

        if (!HashSet.has(current.onStack, target)) {
          return current
        }

        const tokenLow = lowLinkOf(token)(state.nextIndex)(current)
        const targetIndex = tarjanIndexOf(target)(0)(current)
        const nextLow = Math.min(tokenLow, targetIndex)
        return withLowLink(token, nextLow)(current)
      })

      const tokenLow = lowLinkOf(token)(state.nextIndex)(afterTargets)
      const tokenIndex = tarjanIndexOf(token)(state.nextIndex)(afterTargets)

      if (!strictEqual(tokenLow)(tokenIndex)) {
        return afterTargets
      }

      const emptyStackAcc = Array.empty<string>()
      const [remainingStack, componentTokens] = splitStack(token)(afterTargets.stack, emptyStackAcc)

      const componentMembers = pipe(
        componentTokens,
        Array.flatMap((memberToken) => {
          const memberOption = HashMap.get(nodeByToken, memberToken)
          const members = Option.toArray(memberOption)
          return members
        }),
        Array.sort(entityKeyOrder)
      )

      const frozenComponent = Object.freeze(componentMembers)

      const withoutStack = Array.reduce(componentTokens, afterTargets.onStack, (set, memberToken) =>
        HashSet.remove(set, memberToken)
      )

      const nextComponents = Array.append(afterTargets.components, frozenComponent)
      return new TarjanState({
        ...afterTargets,
        stack: remainingStack,
        onStack: withoutStack,
        components: nextComponents
      })
    }

  const semanticComponents =
    (nodes: ReadonlyArray<SemanticModuleEntityKey>) =>
    (
      references: ReadonlyArray<SemanticReferenceWitness>
    ): ReadonlyArray<ReadonlyArray<SemanticModuleEntityKey>> => {
      const nodeEntries = Array.map(nodes, (node) => {
        const token = portableKeyToken(node)
        return Tuple.make(token, node)
      })

      const nodeByToken = HashMap.fromIterable(nodeEntries)

      const initialAdjacency = Array.reduce(nodes, emptyTokenAdjacency, (adjacency, node) => {
        const nodeToken = portableKeyToken(node)
        const emptyTargets = Array.empty<string>()
        return HashMap.set(adjacency, nodeToken, emptyTargets)
      })

      const withEdges = Array.reduce(references, initialAdjacency, (adjacency, reference) =>
        addReferenceEdge(reference)(adjacency)
      )

      const adjacency = sortAdjacencyTargets(nodeByToken)(withEdges)

      const finalState = Array.reduce(nodes, initialTarjanState, (state, node) => {
        const nodeToken = portableKeyToken(node)
        return connectToken(adjacency, nodeByToken)(nodeToken)(state)
      })

      return pipe(finalState.components, Array.sort(semanticComponentOrder))
    }

  // --- semanticModulePlacementIndexGroup --- groups matches because subscribe is per-file.
  const noneSourceFileValue = Option.none<ts.SourceFile>()
  const noneSourceFile = Function.constant(noneSourceFileValue)

  const sourceFileOfNodeTarget = (nodeTarget: NodeTarget) =>
    pipe(nodeTarget.node, (node) => node.getSourceFile(), Option.some)

  const sourceFileOfFileBearingTarget = (target: PositionTarget | FileTarget) =>
    Option.some(target.sourceFile)

  const sourceFileOfTarget = (target: Target) =>
    pipe(
      EffectMatch.value(target),
      EffectMatch.tag("NodeTarget", sourceFileOfNodeTarget),
      EffectMatch.tag("PositionTarget", sourceFileOfFileBearingTarget),
      EffectMatch.tag("FileTarget", sourceFileOfFileBearingTarget),
      EffectMatch.tag("DirectoryTarget", noneSourceFile),
      EffectMatch.tag("WorkspaceTarget", noneSourceFile),
      EffectMatch.orElse(noneSourceFile)
    )

  const appendMatchesForSourceFile =
    (match: MatcherMatch<SemanticModulePlacementData>) =>
    (
      current: HashMap.HashMap<string, ReadonlyArray<MatcherMatch<SemanticModulePlacementData>>>,
      sourceFile: ts.SourceFile
    ) => {
      const existing = pipe(
        HashMap.get(current, sourceFile.fileName),
        Option.getOrElse(Array.empty)
      )

      const appended = Array.append(existing, match)
      const next = Object.freeze(appended)

      return HashMap.set(current, sourceFile.fileName, next)
    }

  const emptyMatchesByFile = HashMap.empty<
    string,
    ReadonlyArray<MatcherMatch<SemanticModulePlacementData>>
  >()

  const groupMatchesByFile = (
    matches: ReadonlyArray<MatcherMatch<SemanticModulePlacementData>>
  ): HashMap.HashMap<string, ReadonlyArray<MatcherMatch<SemanticModulePlacementData>>> =>
    Array.reduce(matches, emptyMatchesByFile, (current, match) =>
      pipe(
        sourceFileOfTarget(match.target),
        Option.match({
          onNone: Function.constant(current),
          onSome: (sourceFile) => appendMatchesForSourceFile(match)(current, sourceFile)
        })
      )
    )

  // --- semanticModulePlacementMatches --- builds facts because placement advice needs them.
  const isSplitModule = (module: SemanticModuleRecord) =>
    physicalPathsForMembers(module.members).length > 1

  const nodeMatchesAnchor =
    (sourceFile: ts.SourceFile) =>
    (key: SemanticModuleEntityKey) =>
    (node: ts.Node): boolean => {
      const nodeStart = node.getStart(sourceFile)
      const nodeEnd = node.getEnd()
      const sameStart = strictEqual(nodeStart)(key.start)
      const sameEnd = strictEqual(nodeEnd)(key.end)
      const sameKind = strictEqual(node.kind)(key.syntaxKind)
      const positionFlags = Array.make(sameStart, sameEnd)
      const positionMatches = Array.every(positionFlags, Function.identity)

      return positionMatches && sameKind
    }

  const declarationAtAnchor =
    (sourceFile: ts.SourceFile) =>
    (key: SemanticModuleEntityKey): Option.Option<ts.Node> => {
      const matches = nodeMatchesAnchor(sourceFile)(key)

      const visit = (node: ts.Node): Option.Option<ts.Node> => {
        if (matches(node)) {
          return Option.some(node)
        }

        const children = node.getChildren(sourceFile)
        const noneFound = Option.none<ts.Node>()
        return Array.reduce(children, noneFound, (found, child) =>
          Option.isSome(found) ? found : visit(child)
        )
      }

      return visit(sourceFile)
    }

  const splitMatchForModule =
    (context: ProgramMatchContext) =>
    (snapshot: SemanticModuleSnapshotV1) =>
    (
      module: SemanticModuleRecord
    ): Result.Result<MatcherMatch<SemanticModulePlacementData>, void> => {
      const firstMember = moduleFirstMember(module)

      return pipe(
        sourceFileByWorkspacePath(context)(firstMember.path),
        Option.flatMap((sourceFile) => {
          const declaration = declarationAtAnchor(sourceFile)(firstMember)
          return Option.map(declaration, (node) => {
            const slice = sliceForModule(context)(snapshot)(module)
            const moduleArray = Array.of(slice)
            const modules = Object.freeze(moduleArray)
            const fact = SplitSemanticModulePlacementData.make({ modules })
            Object.freeze(fact.modules)
            const frozenFact = Object.freeze(fact)
            return makeNodeMatch(node, frozenFact)
          })
        }),
        Result.fromOption(Function.constVoid)
      )
    }

  const memberPathEquals = (path: string) => (member: SemanticModuleEntityKey) =>
    strictEqual(member.path)(path)

  const moduleRepresentsPath = (path: string) => (module: SemanticModuleRecord) =>
    Array.some(module.members, memberPathEquals(path))

  const modulesRepresentedInPath =
    (snapshot: SemanticModuleSnapshotV1) =>
    (path: string): ReadonlyArray<SemanticModuleRecord> =>
      pipe(snapshot.modules, Array.filter(moduleRepresentsPath(path)), Array.sort(moduleOrder))

  const mixedMatchForPath =
    (context: ProgramMatchContext) =>
    (snapshot: SemanticModuleSnapshotV1) =>
    (path: string): Result.Result<MatcherMatch<SemanticModulePlacementData>, void> => {
      const modules = modulesRepresentedInPath(snapshot)(path)

      if (modules.length < 2) {
        return Result.failVoid
      }

      return pipe(
        sourceFileByWorkspacePath(context)(path),
        Option.map((sourceFile) => {
          const slices = pipe(modules, Array.map(sliceForModule(context)(snapshot)), freeze)

          const fact = MixedPhysicalModulePlacementData.make({
            physicalModulePath: path,
            modules: slices
          })

          Object.freeze(fact.modules)

          const frozenFact = Object.freeze(fact)
          return makePositionMatch(sourceFile, 1, 1, frozenFact)
        }),
        Result.fromOption(Function.constVoid)
      )
    }

  const entityKeyPath = (entity: SemanticModuleEntityRecord) => entity.key.path

  const physicalPathsInSnapshot = (snapshot: SemanticModuleSnapshotV1): ReadonlyArray<string> =>
    pipe(snapshot.entities, Array.map(entityKeyPath), uniqueSortedPaths)

  const placementMatches =
    (context: ProgramMatchContext) =>
    (
      snapshot: SemanticModuleSnapshotV1
    ): ReadonlyArray<MatcherMatch<SemanticModulePlacementData>> => {
      const splitMatches = pipe(
        snapshot.modules,
        Array.filter(isSplitModule),
        Array.sort(moduleOrder),
        Array.filterMap(splitMatchForModule(context)(snapshot))
      )

      const mixedMatches = pipe(
        physicalPathsInSnapshot(snapshot),
        Array.filterMap(mixedMatchForPath(context)(snapshot))
      )

      return pipe(splitMatches, Array.appendAll(mixedMatches), freeze)
    }

  // --- semanticReferenceGraphBuilder --- collects edges because hard-bond rules need the graph.
  const ownedEntityDeclarations = Struct.get<OwnedEntity, "declarations">("declarations")
  const ownedEntitySymbols = Struct.get<OwnedEntity, "ownedSymbols">("ownedSymbols")

  // ReferenceMaps holds owned and unowned edges because reference collection folds both maps.
  class ReferenceMaps extends Data.Class<{
    readonly references: HashMap.HashMap<string, SemanticReferenceWitness>
    readonly unowned: HashMap.HashMap<string, UnownedSemanticReferenceWitness>
  }> {}

  const callOrValueKind =
    (identifier: ts.Identifier) =>
    (expression: ts.CallExpression): SemanticReferenceKind =>
      nodeEquivalence(expression.expression, identifier) ? "call" : "value"

  const constructionOrValueKind =
    (identifier: ts.Identifier) =>
    (expression: ts.NewExpression): SemanticReferenceKind =>
      nodeEquivalence(expression.expression, identifier) ? "construction" : "value"

  const heritageOrTypeKind = (expression: ts.ExpressionWithTypeArguments): SemanticReferenceKind =>
    ts.isHeritageClause(expression.parent) ? "inheritance" : "type"

  const initializerContainsIdentifier =
    (identifier: ts.Identifier) =>
    (initializer: ts.Expression): boolean =>
      initializer.getStart() <= identifier.getStart() && identifier.getEnd() <= initializer.getEnd()

  const variableInitializerKind =
    (identifier: ts.Identifier) =>
    (declaration: ts.VariableDeclaration): SemanticReferenceKind =>
      pipe(
        Option.fromNullishOr(declaration.initializer),
        Option.exists(initializerContainsIdentifier(identifier))
      )
        ? "initializer"
        : "value"

  const propertyDeclarationKind = (declaration: ts.PropertyDeclaration): SemanticReferenceKind =>
    pipe(Option.fromNullishOr(declaration.initializer), Option.isSome) ? "initializer" : "value"

  const referenceKindForIdentifier = (identifier: ts.Identifier): SemanticReferenceKind =>
    pipe(
      EffectMatch.value(identifier.parent),
      EffectMatch.when(ts.isCallExpression, callOrValueKind(identifier)),
      EffectMatch.when(ts.isNewExpression, constructionOrValueKind(identifier)),
      EffectMatch.when(ts.isDecorator, Function.constant("decorator" as const)),
      EffectMatch.when(ts.isHeritageClause, Function.constant("inheritance" as const)),
      EffectMatch.when(ts.isExpressionWithTypeArguments, heritageOrTypeKind),
      EffectMatch.when(ts.isTypeReferenceNode, Function.constant("type" as const)),
      EffectMatch.when(ts.isTypeQueryNode, Function.constant("type" as const)),
      EffectMatch.when(ts.isImportTypeNode, Function.constant("type" as const)),
      EffectMatch.when(ts.isVariableDeclaration, variableInitializerKind(identifier)),
      EffectMatch.when(ts.isPropertyAssignment, Function.constant("initializer" as const)),
      EffectMatch.when(ts.isPropertyDeclaration, propertyDeclarationKind),
      EffectMatch.orElse(Function.constant("value" as const))
    )

  const referenceConsumerOrder: Order.Order<SemanticReferenceWitness> = Order.mapInput(
    entityKeyOrder,
    Struct.get("consumer")
  )

  const referenceTargetOrder: Order.Order<SemanticReferenceWitness> = Order.mapInput(
    entityKeyOrder,
    Struct.get("target")
  )

  const referenceAnchorOrder: Order.Order<SemanticReferenceWitness> = Order.mapInput(
    entityKeyOrder,
    Struct.get("reference")
  )

  const referenceWitnessOrders = Array.make(
    referenceConsumerOrder,
    referenceTargetOrder,
    referenceAnchorOrder
  )

  const semanticReferenceOrder = Order.combineAll(referenceWitnessOrders)

  const unownedReferenceTargetOrder: Order.Order<UnownedSemanticReferenceWitness> = Order.mapInput(
    entityKeyOrder,
    Struct.get("target")
  )

  const unownedReferenceAnchorOrder: Order.Order<UnownedSemanticReferenceWitness> = Order.mapInput(
    entityKeyOrder,
    Struct.get("reference")
  )

  const unownedReferenceOrders = Array.make(
    unownedReferenceTargetOrder,
    unownedReferenceAnchorOrder
  )

  const unownedSemanticReferenceOrder = Order.combineAll(unownedReferenceOrders)

  const semanticReferenceToken = (reference: SemanticReferenceWitness) => {
    const consumerToken = portableKeyToken(reference.consumer)
    const targetToken = portableKeyToken(reference.target)
    const referenceToken = portableKeyToken(reference.reference)
    const parts = Array.make(consumerToken, targetToken, referenceToken)
    return Array.join(parts, "")
  }

  const unownedSemanticReferenceToken = (reference: UnownedSemanticReferenceWitness) => {
    const targetToken = portableKeyToken(reference.target)
    const referenceToken = portableKeyToken(reference.reference)
    const parts = Array.make(targetToken, referenceToken)
    return Array.join(parts, "")
  }

  const importExportAncestorKinds = Array.make(
    ts.SyntaxKind.ImportDeclaration,
    ts.SyntaxKind.ImportEqualsDeclaration,
    ts.SyntaxKind.ExportDeclaration,
    ts.SyntaxKind.ExportAssignment
  )

  const isImportExportAncestorKind = (kind: ts.SyntaxKind) =>
    Array.contains(importExportAncestorKinds, kind)

  const parentNode = (node: ts.Node): Option.Option<ts.Node> =>
    ts.isSourceFile(node) ? Option.none() : Option.some(node.parent)

  const isImportOrExportReference = (node: ts.Node) => {
    const visit = (current: ts.Node): boolean =>
      isImportExportAncestorKind(current.kind) || pipe(parentNode(current), Option.exists(visit))

    return pipe(parentNode(node), Option.exists(visit))
  }

  const isBindingNameReference = (identifier: ts.Identifier) => (parent: ts.BindingElement) => {
    const nameNode = Option.fromNullishOr(parent.name)
    const propertyNameNode = Option.fromNullishOr(parent.propertyName)
    const nameMatches = namedNodeEquals(identifier)(nameNode)
    const propertyMatches = namedNodeEquals(identifier)(propertyNameNode)
    const matchFlags = Array.make(nameMatches, propertyMatches)
    return Array.some(matchFlags, Function.identity)
  }

  const namedDeclarationName = (declaration: ts.NamedDeclaration): Option.Option<ts.Node> =>
    Option.fromNullishOr(declaration.name)

  const isNamedDeclarationReference =
    (identifier: ts.Identifier) => (parent: ts.NamedDeclaration) =>
      pipe(parent, namedDeclarationName, namedNodeEquals(identifier))

  const declarationNameGuard =
    (guard: (node: ts.Node) => boolean) =>
    (nameEquals: (parent: ts.NamedDeclaration) => boolean) =>
    (node: ts.Node): boolean =>
      guard(node) && nameEquals(node as ts.NamedDeclaration)

  const bindingNameGuard =
    (bindingEquals: (parent: ts.BindingElement) => boolean) =>
    (node: ts.Node): boolean =>
      ts.isBindingElement(node) && bindingEquals(node)

  const declarationNamePredicates = (
    identifier: ts.Identifier
  ): ReadonlyArray<(node: ts.Node) => boolean> => {
    const nameEquals = isNamedDeclarationReference(identifier)
    const bindingEquals = isBindingNameReference(identifier)

    return Array.make(
      declarationNameGuard(ts.isVariableDeclaration)(nameEquals),
      bindingNameGuard(bindingEquals),
      declarationNameGuard(ts.isParameter)(nameEquals),
      declarationNameGuard(ts.isFunctionDeclaration)(nameEquals),
      declarationNameGuard(ts.isFunctionExpression)(nameEquals),
      declarationNameGuard(ts.isClassDeclaration)(nameEquals),
      declarationNameGuard(ts.isClassExpression)(nameEquals),
      declarationNameGuard(ts.isInterfaceDeclaration)(nameEquals),
      declarationNameGuard(ts.isTypeAliasDeclaration)(nameEquals),
      declarationNameGuard(ts.isEnumDeclaration)(nameEquals),
      declarationNameGuard(ts.isEnumMember)(nameEquals),
      declarationNameGuard(ts.isModuleDeclaration)(nameEquals),
      declarationNameGuard(ts.isTypeParameterDeclaration)(nameEquals),
      declarationNameGuard(ts.isPropertyDeclaration)(nameEquals),
      declarationNameGuard(ts.isPropertySignature)(nameEquals),
      declarationNameGuard(ts.isMethodDeclaration)(nameEquals),
      declarationNameGuard(ts.isMethodSignature)(nameEquals),
      declarationNameGuard(ts.isGetAccessorDeclaration)(nameEquals),
      declarationNameGuard(ts.isSetAccessorDeclaration)(nameEquals),
      declarationNameGuard(ts.isPropertyAssignment)(nameEquals)
    )
  }

  const isDeclarationNameReference = (identifier: ts.Identifier) => {
    const predicates = declarationNamePredicates(identifier)
    const matchesParent = (predicate: (node: ts.Node) => boolean) => predicate(identifier.parent)
    return Array.some(predicates, matchesParent)
  }

  const shorthandAssignmentSymbol =
    (checker: ts.TypeChecker) =>
    (identifier: ts.Identifier): Option.Option<ts.Symbol> => {
      const isShorthandName =
        ts.isShorthandPropertyAssignment(identifier.parent) &&
        nodeEquivalence(identifier.parent.name, identifier)

      if (!isShorthandName) {
        return Option.none()
      }
      const shorthandSymbol = checker.getShorthandAssignmentValueSymbol(identifier.parent)
      return Option.fromNullishOr(shorthandSymbol)
    }

  const referencedSymbolAt =
    (checker: ts.TypeChecker) =>
    (identifier: ts.Identifier): Option.Option<ts.Symbol> =>
      pipe(
        identifier,
        shorthandAssignmentSymbol(checker),
        Option.orElse(() => resolvedSymbolAt(checker)(identifier))
      )

  const declarationContainsNode = (node: ts.Node) => (declaration: EntityDeclaration) => {
    const sourceFile = declaration.getSourceFile()
    const startsAtOrAfterDeclaration = node.getStart(sourceFile) >= declaration.getStart(sourceFile)
    const endsAtOrBeforeDeclaration = node.getEnd() <= declaration.getEnd()

    return startsAtOrAfterDeclaration && endsAtOrBeforeDeclaration
  }

  const ownerForReference =
    (ownedEntities: ReadonlyArray<OwnedEntity>) =>
    (node: ts.Node): Option.Option<OwnedEntity> => {
      const entityOwnsNode = (entity: OwnedEntity) => {
        const declarations = ownedEntityDeclarations(entity)
        return Array.some(declarations, declarationContainsNode(node))
      }

      return Array.findFirst(ownedEntities, entityOwnsNode)
    }

  const referenceAnchor =
    (sourcePath: string) => (sourceFile: ts.SourceFile) => (node: ts.Node) => {
      const nodeStart = node.getStart(sourceFile)
      const nodeEnd = node.getEnd()
      return SemanticModuleEntityKey.make({
        path: sourcePath,
        start: nodeStart,
        end: nodeEnd,
        syntaxKind: node.kind
      })
    }

  const addEntityToSourcePathIndex = (
    entitiesBySourcePath: HashMap.HashMap<string, ReadonlyArray<OwnedEntity>>,
    entity: OwnedEntity
  ): HashMap.HashMap<string, ReadonlyArray<OwnedEntity>> => {
    const record = ownedEntityRecord(entity)

    const existing = pipe(
      HashMap.get(entitiesBySourcePath, record.key.path),
      Option.getOrElse(Array.empty)
    )

    const nextEntities = Array.append(existing, entity)
    return HashMap.set(entitiesBySourcePath, record.key.path, nextEntities)
  }

  const appendOwnerRecord =
    (record: SemanticModuleEntityRecord) =>
    (
      owners: ReadonlyArray<SemanticModuleEntityRecord>
    ): ReadonlyArray<SemanticModuleEntityRecord> =>
      Array.some(owners, (owner) => {
        const sameKey = entityKeyEquivalence(owner.key, record.key)
        return sameKey
      })
        ? owners
        : Array.append(owners, record)

  const indexEntityOwners =
    (checker: ts.TypeChecker) =>
    (
      ownersBySymbol: HashMap.HashMap<string, ReadonlyArray<SemanticModuleEntityRecord>>,
      entity: OwnedEntity
    ): HashMap.HashMap<string, ReadonlyArray<SemanticModuleEntityRecord>> => {
      const record = ownedEntityRecord(entity)
      const symbols = ownedEntitySymbols(entity)
      return Array.reduce(symbols, ownersBySymbol, (current, symbol) => {
        const canonical = canonicalSymbol(checker)(symbol)
        const symbolKey = declarationOwnershipKey(canonical)
        const owners = pipe(HashMap.get(current, symbolKey), Option.getOrElse(Array.empty))
        const nextOwners = appendOwnerRecord(record)(owners)
        return HashMap.set(current, symbolKey, nextOwners)
      })
    }

  const isNonDeclarationReferenceIdentifier = (identifier: ts.Identifier) => {
    const notDeclarationName = !isDeclarationNameReference(identifier)
    const notImportExport = !isImportOrExportReference(identifier)
    const flags = Array.make(notDeclarationName, notImportExport)
    return Array.every(flags, Function.identity)
  }

  const isReferenceIdentifier = (node: ts.Node): node is ts.Identifier =>
    ts.isIdentifier(node) && isNonDeclarationReferenceIdentifier(node)

  const buildSemanticReferenceGraph =
    (context: ProgramMatchContext) =>
    (ownedEntities: ReadonlyArray<OwnedEntity>): SemanticModuleReferenceGraph => {
      const emptyEntitiesBySourcePath = HashMap.empty<string, ReadonlyArray<OwnedEntity>>()

      const entitiesBySourcePath = Array.reduce(
        ownedEntities,
        emptyEntitiesBySourcePath,
        addEntityToSourcePathIndex
      )

      const emptyOwnersBySymbol = HashMap.empty<string, ReadonlyArray<SemanticModuleEntityRecord>>()

      const ownersBySymbol = Array.reduce(
        ownedEntities,
        emptyOwnersBySymbol,
        indexEntityOwners(context.checker)
      )

      const emptyReferenceMap = HashMap.empty<string, SemanticReferenceWitness>()
      const emptyUnownedMap = HashMap.empty<string, UnownedSemanticReferenceWitness>()

      const emptyReferenceMaps = new ReferenceMaps({
        references: emptyReferenceMap,
        unowned: emptyUnownedMap
      })

      const makeMapsWithOwnedReference =
        (reference: SemanticReferenceWitness) => (maps: ReferenceMaps) => {
          const token = semanticReferenceToken(reference)
          const references = HashMap.set(maps.references, token, reference)
          return new ReferenceMaps({
            references,
            unowned: maps.unowned
          })
        }

      const makeMapsWithUnownedReference =
        (reference: UnownedSemanticReferenceWitness) => (maps: ReferenceMaps) => {
          const token = unownedSemanticReferenceToken(reference)
          const unowned = HashMap.set(maps.unowned, token, reference)
          return new ReferenceMaps({
            references: maps.references,
            unowned
          })
        }

      const collectFromSourceFile = (maps: ReferenceMaps, sourceFile: ts.SourceFile) => {
        const projectRelativePath = toRelativeFileName(context.projectRoot)(sourceFile.fileName)

        const sourcePath = toWorkspacePath(
          context.projectRoot,
          context.workspaceRoot
        )(projectRelativePath)

        const sourceEntities = pipe(
          HashMap.get(entitiesBySourcePath, sourcePath),
          Option.getOrElse(Array.empty)
        )

        const ownerAt = ownerForReference(sourceEntities)
        const anchorAt = referenceAnchor(sourcePath)(sourceFile)

        const sourceStratum = isTestSourceFile(context.workspaceRoot)(sourceFile)
          ? ("test" as const)
          : ("production" as const)

        const visit = (currentMaps: ReferenceMaps, node: ts.Node): ReferenceMaps => {
          const collectReferenceAtNode = () => {
            if (!isReferenceIdentifier(node)) {
              return currentMaps
            }

            const kind = referenceKindForIdentifier(node)

            return pipe(
              referencedSymbolAt(context.checker)(node),
              Option.map((referencedSymbol) => {
                const ownershipKey = declarationOwnershipKey(referencedSymbol)

                const targetOwners = pipe(
                  HashMap.get(ownersBySymbol, ownershipKey),
                  Option.getOrElse(Array.empty)
                )

                const consumer = ownerAt(node)
                const referenceAnchorNode = anchorAt(node)

                const reduceTargetOwner = (
                  innerMaps: ReferenceMaps,
                  target: SemanticModuleEntityRecord
                ) => {
                  if (Option.isNone(consumer)) {
                    const stratumMatches = strictEqual(target.stratum)(sourceStratum)

                    const unownedReference = unownedSemanticReferenceWitnessSchema.make({
                      target: target.key,
                      reference: referenceAnchorNode,
                      kind
                    })

                    return stratumMatches
                      ? makeMapsWithUnownedReference(unownedReference)(innerMaps)
                      : innerMaps
                  }

                  const consumerRecord = ownedEntityRecord(consumer.value)
                  const sameStratum = strictEqual(consumerRecord.stratum)(target.stratum)
                  const differentEntity = !entityKeyEquivalence(consumerRecord.key, target.key)
                  const shouldRecordOwned = sameStratum && differentEntity
                  if (!shouldRecordOwned) {
                    return innerMaps
                  }

                  const ownedReference = semanticReferenceWitnessSchema.make({
                    consumer: consumerRecord.key,
                    target: target.key,
                    reference: referenceAnchorNode,
                    kind
                  })

                  return makeMapsWithOwnedReference(ownedReference)(innerMaps)
                }

                return Array.reduce(targetOwners, currentMaps, reduceTargetOwner)
              }),
              Option.getOrElse(Function.constant(currentMaps))
            )
          }

          const withReference = collectReferenceAtNode()
          const children = node.getChildren(sourceFile)
          return Array.reduce(children, withReference, visit)
        }

        return visit(maps, sourceFile)
      }

      const referenceMaps = Array.reduce(
        context.sourceFiles,
        emptyReferenceMaps,
        collectFromSourceFile
      )

      const nodes = pipe(
        ownedEntities,
        Array.map(ownedEntityRecord),
        Array.map(Struct.get("key")),
        Array.sort(entityKeyOrder)
      )

      const references = pipe(
        HashMap.toValues(referenceMaps.references),
        Array.sort(semanticReferenceOrder)
      )

      const unownedConsumers = pipe(
        HashMap.toValues(referenceMaps.unowned),
        Array.sort(unownedSemanticReferenceOrder)
      )

      const components = semanticComponents(nodes)(references)

      return new SemanticModuleReferenceGraph({
        nodes,
        references,
        unownedConsumers,
        components
      })
    }

  // --- sourceEntityNormalization --- materializes entities because snapshots need stable records.
  const entityRecordOrder: Order.Order<SemanticModuleEntityRecord> = Order.mapInput(
    entityKeyOrder,
    Struct.get("key")
  )

  const exclusionAnchorOrder: Order.Order<SemanticModuleExclusionRecord> = Order.mapInput(
    entityKeyOrder,
    Struct.get("anchor")
  )

  const exclusionReasonOrder: Order.Order<SemanticModuleExclusionRecord> = Order.mapInput(
    Order.String,
    Struct.get("reason")
  )

  const exclusionOrders = Array.make(exclusionAnchorOrder, exclusionReasonOrder)
  const exclusionOrder = Order.combineAll(exclusionOrders)
  const emptyEntityDeclarations: ReadonlyArray<EntityDeclaration> = Array.empty()
  const functionDeclarationKind = Function.constant("FunctionDeclaration" as const)
  const classDeclarationKind = Function.constant("ClassDeclaration" as const)
  const interfaceDeclarationKind = Function.constant("InterfaceDeclaration" as const)
  const typeAliasDeclarationKind = Function.constant("TypeAliasDeclaration" as const)
  const enumDeclarationKind = Function.constant("EnumDeclaration" as const)
  const variableDeclarationKind = Function.constant("VariableDeclaration" as const)
  const moduleDeclarationKind = Function.constant("ModuleDeclaration" as const)

  const declarationKind = pipe(
    EffectMatch.type<EntityDeclaration>(),
    EffectMatch.when(ts.isFunctionDeclaration, functionDeclarationKind),
    EffectMatch.when(ts.isClassDeclaration, classDeclarationKind),
    EffectMatch.when(ts.isInterfaceDeclaration, interfaceDeclarationKind),
    EffectMatch.when(ts.isTypeAliasDeclaration, typeAliasDeclarationKind),
    EffectMatch.when(ts.isEnumDeclaration, enumDeclarationKind),
    EffectMatch.when(ts.isVariableDeclaration, variableDeclarationKind),
    EffectMatch.orElse(moduleDeclarationKind)
  )

  const moduleDisplayName = (
    declaration: ts.ModuleDeclaration | ts.NamespaceDeclaration
  ): string => {
    const prependSegment = (nestedText: string) => `${declaration.name.text}.${nestedText}`

    return pipe(
      declaration.body,
      Option.fromNullishOr,
      Option.filter(isModuleDeclarationBody),
      Option.map(moduleDisplayName),
      Option.map(prependSegment),
      Option.getOrElse(() => declaration.name.text)
    )
  }

  const variableDisplayName = Function.flow(
    Struct.get<ts.VariableDeclaration, "name">("name"),
    bindingIdentifiers,
    Array.map(Struct.get("text")),
    Array.join(", ")
  )

  const defaultFunctionDisplayName = (declaration: ts.FunctionDeclaration) =>
    pipe(
      declaration.name,
      Option.fromNullishOr,
      Option.map(Struct.get("text")),
      Option.getOrElse(Function.constant("<default function>"))
    )

  const defaultClassDisplayName = (declaration: ts.ClassDeclaration) =>
    pipe(
      declaration.name,
      Option.fromNullishOr,
      Option.map(Struct.get("text")),
      Option.getOrElse(Function.constant("<default class>"))
    )

  const requiredDisplayText = (
    declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration
  ) => declaration.name.text

  const declarationDisplayName = pipe(
    EffectMatch.type<EntityDeclaration>(),
    EffectMatch.when(ts.isVariableDeclaration, variableDisplayName),
    EffectMatch.when(ts.isModuleDeclaration, moduleDisplayName),
    EffectMatch.when(ts.isFunctionDeclaration, defaultFunctionDisplayName),
    EffectMatch.when(ts.isClassDeclaration, defaultClassDisplayName),
    EffectMatch.when(ts.isInterfaceDeclaration, requiredDisplayText),
    EffectMatch.when(ts.isTypeAliasDeclaration, requiredDisplayText),
    EffectMatch.orElse(requiredDisplayText)
  )

  const candidateBondSymbols = Struct.get<EntityCandidate, "bondSymbols">("bondSymbols")
  const candidateDeclarations = Struct.get<EntityCandidate, "declarations">("declarations")
  const candidateSymbols = Struct.get<EntityCandidate, "ownedSymbols">("ownedSymbols")

  const functionCandidates =
    (checker: ts.TypeChecker) =>
    (sourceFile: ts.SourceFile) =>
    (declarations: ReadonlyArray<ts.FunctionDeclaration>): ReadonlyArray<EntityCandidate> => {
      const entryForDeclaration = (declaration: ts.FunctionDeclaration) => {
        const symbol = pipe(declaration, symbolsForDeclaration(checker)(sourceFile), Array.head)
        return Tuple.make(declaration, symbol)
      }

      const entries = Array.map(declarations, entryForDeclaration)
      const entryDeclaration = Tuple.get<(typeof entries)[number], 0>(0)
      const entrySymbol = Tuple.get<(typeof entries)[number], 1>(1)

      return Array.flatMap(entries, (entry, index) => {
        const symbol = entrySymbol(entry)

        const isSameSymbol = (candidate: (typeof entries)[number]) => {
          const candidateSymbol = entrySymbol(candidate)
          return pipe(
            symbol,
            Option.zipWith(candidateSymbol, symbolEquivalence),
            Option.getOrElse(Function.constFalse)
          )
        }

        const precedingEntries = Array.take(entries, index)
        const alreadyGrouped = Array.some(precedingEntries, isSameSymbol)

        if (alreadyGrouped) {
          return Array.empty()
        }

        const familyEntries = Option.isSome(symbol)
          ? Array.filter(entries, isSameSymbol)
          : Array.of(entry)

        const familyDeclarations = Array.map(familyEntries, entryDeclaration)
        const candidate = pipe(familyDeclarations, makeCandidate(checker)(sourceFile))
        return Array.of(candidate)
      })
    }

  const variableStatementDeclarations = Function.flow(
    Struct.get<ts.VariableStatement, "declarationList">("declarationList"),
    Struct.get("declarations")
  )

  const declarationsForStatement = pipe(
    EffectMatch.type<ts.Statement>(),
    EffectMatch.when(ts.isVariableStatement, variableStatementDeclarations),
    EffectMatch.when(ts.isClassDeclaration, singletonEntityDeclaration),
    EffectMatch.when(ts.isInterfaceDeclaration, singletonEntityDeclaration),
    EffectMatch.when(ts.isTypeAliasDeclaration, singletonEntityDeclaration),
    EffectMatch.when(ts.isEnumDeclaration, singletonEntityDeclaration),
    EffectMatch.when(ts.isModuleDeclaration, singletonEntityDeclaration),
    EffectMatch.orElse(Function.constant(emptyEntityDeclarations))
  )

  const nonFunctionCandidates =
    (checker: ts.TypeChecker) =>
    (sourceFile: ts.SourceFile) =>
    (statement: ts.Statement): ReadonlyArray<EntityCandidate> => {
      const candidateForDeclaration = Function.flow(
        singletonEntityDeclaration,
        makeCandidate(checker)(sourceFile)
      )

      return pipe(statement, declarationsForStatement, Array.map(candidateForDeclaration))
    }

  const candidatesInSource =
    (checker: ts.TypeChecker) =>
    (sourceFile: ts.SourceFile): ReadonlyArray<EntityCandidate> => {
      const declarations = Array.filter(sourceFile.statements, ts.isFunctionDeclaration)
      const functions = pipe(declarations, functionCandidates(checker)(sourceFile))

      const others = pipe(
        sourceFile.statements,
        Array.flatMap(nonFunctionCandidates(checker)(sourceFile))
      )

      return Array.appendAll(functions, others)
    }

  const isDeclareModifier = Function.flow(
    Struct.get<ts.Modifier, "kind">("kind"),
    strictEqual(ts.SyntaxKind.DeclareKeyword)
  )

  const modifiersFromNode = Function.flow(ts.getModifiers, Option.fromNullishOr)

  const declarationModifiers = Function.flow(
    Option.liftPredicate(ts.canHaveModifiers),
    Option.flatMap(modifiersFromNode)
  )

  const hasDeclareModifier = Function.flow(
    declarationModifiers,
    Option.exists(Array.some(isDeclareModifier))
  )

  const ambientDeclarationNode = (declaration: EntityDeclaration) =>
    ts.isVariableDeclaration(declaration) ? declaration.parent.parent : declaration

  const isAmbientDeclaration = (declaration: EntityDeclaration) => {
    const ambientNode = ambientDeclarationNode(declaration)
    const globalAugmentationFlags = ambientNode.flags & ts.NodeFlags.GlobalAugmentation
    const isGlobalAugmentation = Predicate.not(strictEqual(0))(globalAugmentationFlags)
    const hasAmbientModifier = hasDeclareModifier(ambientNode)
    const ambientReasons = Array.make(hasAmbientModifier, isGlobalAugmentation)
    return Array.some(ambientReasons, Function.identity)
  }

  const isAmbientCandidate =
    (sourceFile: ts.SourceFile) =>
    (candidate: EntityCandidate): boolean => {
      const hasAmbientDeclaration = pipe(
        candidate,
        candidateDeclarations,
        Array.some(isAmbientDeclaration)
      )

      const ambientReasons = Array.make(sourceFile.isDeclarationFile, hasAmbientDeclaration)
      return Array.some(ambientReasons, Function.identity)
    }

  const candidateAnchor = (sourcePath: string) =>
    Function.flow(candidateDeclarations, Array.head, Option.getOrThrow, entityKey(sourcePath))

  const makeExclusion =
    (sourcePath: string) =>
    (reason: "ambient-declaration" | "missing-symbol") =>
    (candidate: EntityCandidate): SemanticModuleExclusionRecord => {
      const anchor = pipe(candidate, candidateAnchor(sourcePath))
      return SemanticModuleExclusionRecord.make({ anchor, reason })
    }

  const makeEntity =
    (context: ProgramMatchContext) =>
    (sourceFile: ts.SourceFile) =>
    (sourcePath: string) =>
    (candidate: EntityCandidate): OwnedEntity => {
      const declarations = candidateDeclarations(candidate)

      const declarationAnchorValues = pipe(
        declarations,
        Array.map(entityKey(sourcePath)),
        Array.sort(entityKeyOrder)
      )

      const declarationAnchors = Object.freeze(declarationAnchorValues)
      const anchorOption = Array.head(declarations)
      const anchor = Option.getOrThrow(anchorOption)
      const keyOption = Array.head(declarationAnchors)
      const key = Option.getOrThrow(keyOption)
      const sourceFileIsTest = isTestSourceFile(context.workspaceRoot)(sourceFile)
      const stratum = sourceFileIsTest ? ("test" as const) : ("production" as const)
      const displayName = declarationDisplayName(anchor)
      const kind = declarationKind(anchor)

      const record = SemanticModuleEntityRecord.make({
        key,
        declarationAnchors,
        stratum,
        displayName,
        declarationKind: kind
      })

      const ownedSymbols = candidateSymbols(candidate)
      const bondSymbols = candidateBondSymbols(candidate)
      return new OwnedEntity({
        record,
        declarations,
        ownedSymbols,
        bondSymbols
      })
    }

  const candidateHasNoSymbols = Function.flow(
    candidateSymbols,
    Struct.get("length"),
    strictEqual(0)
  )

  const makeSourceNormalization =
    (context: ProgramMatchContext) =>
    (sourceFile: ts.SourceFile): SourceNormalization => {
      const projectRelativePath = toRelativeFileName(context.projectRoot)(sourceFile.fileName)

      const sourcePath = pipe(
        projectRelativePath,
        toWorkspacePath(context.projectRoot, context.workspaceRoot)
      )

      const candidates = candidatesInSource(context.checker)(sourceFile)
      const candidateIsAmbient = isAmbientCandidate(sourceFile)
      const ambientCandidates = Array.filter(candidates, candidateIsAmbient)
      const nonAmbientCandidates = Array.filter(candidates, Predicate.not(candidateIsAmbient))
      const missingSymbolCandidates = Array.filter(nonAmbientCandidates, candidateHasNoSymbols)

      const includedCandidates = Array.filter(
        nonAmbientCandidates,
        Predicate.not(candidateHasNoSymbols)
      )

      const entities = Array.map(includedCandidates, makeEntity(context)(sourceFile)(sourcePath))

      const ambientExclusions = Array.map(
        ambientCandidates,
        makeExclusion(sourcePath)("ambient-declaration")
      )

      const missingSymbolExclusions = Array.map(
        missingSymbolCandidates,
        makeExclusion(sourcePath)("missing-symbol")
      )

      const exclusions = Array.appendAll(ambientExclusions, missingSymbolExclusions)
      return new SourceNormalization({ entities, exclusions })
    }

  const ownedEntityRecordOrder = Order.mapInput(entityRecordOrder, ownedEntityRecord)
  const normalizedEntities = Struct.get<SourceNormalization, "entities">("entities")
  const normalizedExclusions = Struct.get<SourceNormalization, "exclusions">("exclusions")

  const acceptedBondOrder: Order.Order<SemanticModuleAcceptedBondRecord> = Order.mapInput(
    bondKeyOrder,
    Struct.get("key")
  )

  const suppressedBondOrder: Order.Order<SemanticModuleSuppressedBondRecord> = Order.mapInput(
    bondKeyOrder,
    Struct.get("key")
  )

  const acceptedBondKeyEquivalence: Equivalence.Equivalence<SemanticModuleAcceptedBondRecord> =
    Equivalence.mapInput(bondKeyEquivalence, Struct.get("key"))

  const makeRawBondFromParadigm =
    (rule: SemanticModuleHardBondRule) =>
    (candidate: SemanticModuleHardBondCandidate): SemanticModuleAcceptedBondRecord => {
      Schema.decodeUnknownSync(rule.evidenceSchema)(candidate.evidence)

      const key = makeBondKey(candidate.left, candidate.right, rule.id, candidate.evidenceKey)
      const evidence = freezeEvidence(candidate.evidence)

      return SemanticModuleAcceptedBondRecord.make({ key, evidence })
    }

  const paradigmCandidates =
    (context: ProgramMatchContext) =>
    (entities: ReadonlyArray<SemanticModuleEntityRecord>) =>
    (referenceGraph: SemanticModuleReferenceGraph) =>
    (rule: SemanticModuleHardBondRule): ReadonlyArray<SemanticModuleAcceptedBondRecord> =>
      pipe(
        rule.candidates(context, entities, referenceGraph),
        Array.map(makeRawBondFromParadigm(rule))
      )

  const catalogCandidates =
    (context: ProgramMatchContext) =>
    (ownedEntities: ReadonlyArray<OwnedEntity>) =>
    (entities: ReadonlyArray<SemanticModuleEntityRecord>) =>
    (
      catalog: SemanticModuleHardBondRuleCatalog
    ): ReadonlyArray<SemanticModuleAcceptedBondRecord> => {
      if (strictEqual(0)(catalog.length)) {
        return Array.empty()
      }

      const referenceGraph = buildSemanticReferenceGraph(context)(ownedEntities)

      return pipe(
        catalog,
        Array.flatMap(paradigmCandidates(context)(entities)(referenceGraph)),
        Array.sort(rawBondOrder),
        Array.dedupeWith(rawBondKeyEquivalence)
      )
    }

  const entityByKey =
    (entities: ReadonlyArray<SemanticModuleEntityRecord>) =>
    (key: SemanticModuleEntityKey): Option.Option<SemanticModuleEntityRecord> =>
      Array.findFirst(entities, (entity) => {
        const sameKey = entityKeyEquivalence(entity.key, key)
        return sameKey
      })

  const isAcceptedBond =
    (entities: ReadonlyArray<SemanticModuleEntityRecord>) =>
    (candidate: SemanticModuleAcceptedBondRecord): boolean => {
      const left = entityByKey(entities)(candidate.key.left)
      const right = entityByKey(entities)(candidate.key.right)

      return pipe(
        Option.all({ left, right }),
        Option.exists(({ left: leftEntity, right: rightEntity }) =>
          strictEqual(leftEntity.stratum)(rightEntity.stratum)
        )
      )
    }

  const makeAcceptedBond = (
    candidate: SemanticModuleAcceptedBondRecord
  ): SemanticModuleAcceptedBondRecord =>
    SemanticModuleAcceptedBondRecord.make({
      key: candidate.key,
      evidence: candidate.evidence
    })

  const makeSuppressedBond = (
    candidate: SemanticModuleAcceptedBondRecord
  ): SemanticModuleSuppressedBondRecord =>
    SemanticModuleSuppressedBondRecord.make({
      key: candidate.key,
      evidence: candidate.evidence,
      reason: "production-test-partition-barrier"
    })

  const buildSemanticModuleSnapshot = (
    context: ProgramMatchContext,
    catalog: SemanticModuleHardBondRuleCatalog
  ): SemanticModuleSnapshotV1 => {
    const normalizedSources = Array.map(context.sourceFiles, makeSourceNormalization(context))

    const ownedEntityValues = pipe(
      normalizedSources,
      Array.flatMap(normalizedEntities),
      Array.sort(ownedEntityRecordOrder)
    )

    const entityValues = pipe(
      ownedEntityValues,
      Array.map(ownedEntityRecord),
      Array.map(freezeEntityRecord)
    )

    const exclusionValues = pipe(
      normalizedSources,
      Array.flatMap(normalizedExclusions),
      Array.sort(exclusionOrder)
    )

    const entities = Object.freeze(entityValues)
    const exclusions = Object.freeze(exclusionValues)
    const sameSymbol = sameSymbolCandidates(ownedEntityValues)
    const paradigm = catalogCandidates(context)(ownedEntityValues)(entities)(catalog)

    const candidates = pipe(
      Array.appendAll(sameSymbol, paradigm),
      Array.sort(rawBondOrder),
      Array.dedupeWith(rawBondKeyEquivalence)
    )

    const acceptedBondValues = pipe(
      candidates,
      Array.filter(isAcceptedBond(entities)),
      Array.map(makeAcceptedBond),
      Array.sort(acceptedBondOrder),
      Array.dedupeWith(acceptedBondKeyEquivalence)
    )

    const suppressedBondValues = pipe(
      candidates,
      Array.filter(Predicate.not(isAcceptedBond(entities))),
      Array.map(makeSuppressedBond),
      Array.sort(suppressedBondOrder)
    )

    const acceptedBondList = Array.map(acceptedBondValues, freezeBondRecord)
    const acceptedBonds = Object.freeze(acceptedBondList)
    const suppressedBondList = Array.map(suppressedBondValues, freezeBondRecord)
    const suppressedBonds = Object.freeze(suppressedBondList)
    const moduleValues = closeModules(entities)(acceptedBonds)
    const moduleList = Array.map(moduleValues, freezeModuleRecord)
    const modules = Object.freeze(moduleList)

    const snapshot = SemanticModuleSnapshotV1.make({
      entities,
      modules,
      acceptedBonds,
      suppressedBonds,
      exclusions
    })

    return freezeSnapshot(snapshot)
  }

  const buildPlacementIndex =
    (catalog: SemanticModuleHardBondRuleCatalog) =>
    (context: ProgramMatchContext): PlacementIndex => {
      const snapshot = buildSemanticModuleSnapshot(context, catalog)
      const matches = placementMatches(context)(snapshot)
      const matchesByFile = groupMatchesByFile(matches)

      return new PlacementIndex(snapshot, matchesByFile)
    }

  const semanticModulePlacementMatcher = (catalog: SemanticModuleHardBondRuleCatalog) => {
    const indexBuilder = buildPlacementIndex(catalog)

    const subscribe = (index: PlacementIndex) => {
      const subscriptionsForContext = (context: MatchContext) =>
        pipe(
          HashMap.get(index.matchesByFile, context.sourceFile.fileName),
          Option.getOrElse(Array.empty)
        )

      return fileSubscriptions(subscriptionsForContext)
    }

    return withProgramMatcherIndex(indexBuilder)(subscribe)
  }

  const api = {
    SemanticModuleSnapshotV1,
    buildSemanticModuleSnapshot,
    moduleFor,
    peersFor,
    proofBetween,
    semanticModulePlacementMatcher
  }

  return api
}

export const semanticModuleEngine = createSemanticModuleEngine()
