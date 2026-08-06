import {
  Array,
  Data,
  Equivalence,
  Function,
  Match,
  Option,
  Order,
  Predicate,
  Schema,
  Struct,
  Tuple,
  pipe
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { ProgramMatchContext } from "../../matcher/data.js"
import { toRelativeFileName } from "../../support/paths.js"
import { resolvedSymbolAt } from "../../support/tsNode.js"
import { isTestSourceFile, toWorkspacePath } from "./paths.js"

const declarationKinds = Array.make<
  [
    "FunctionDeclaration",
    "ClassDeclaration",
    "InterfaceDeclaration",
    "TypeAliasDeclaration",
    "EnumDeclaration",
    "VariableDeclaration",
    "ModuleDeclaration"
  ]
>(
  "FunctionDeclaration",
  "ClassDeclaration",
  "InterfaceDeclaration",
  "TypeAliasDeclaration",
  "EnumDeclaration",
  "VariableDeclaration",
  "ModuleDeclaration"
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

// EntityDeclaration is the exact candidate syntax because each family has one normalization rule.
type EntityDeclaration =
  | ts.FunctionDeclaration
  | ts.ClassDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
  | ts.VariableDeclaration
  | ts.ModuleDeclaration

// EntityCandidate keeps compiler ownership private because Symbols cannot cross the snapshot seam.
class EntityCandidate extends Data.Class<{
  readonly declarations: ReadonlyArray<EntityDeclaration>
  readonly ownedSymbols: ReadonlyArray<ts.Symbol>
}> {}

// SourceNormalization separates outputs because entities and exclusions have independent ordering.
class SourceNormalization extends Data.Class<{
  readonly entities: ReadonlyArray<SemanticModuleEntityRecord>
  readonly exclusions: ReadonlyArray<SemanticModuleExclusionRecord>
}> {}

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
const nodeEquivalence = Equivalence.strictEqual<ts.Node>()
const symbolEquivalence = Equivalence.strictEqual<ts.Symbol>()

const emptyBondKeyValues: ReadonlyArray<SemanticModuleBondKey> = Array.empty()
const emptyBondKeys = Object.freeze(emptyBondKeyValues)
const emptyAcceptedBondValues: ReadonlyArray<SemanticModuleAcceptedBondRecord> = Array.empty()
const emptyAcceptedBonds = Object.freeze(emptyAcceptedBondValues)
const emptySuppressedBondValues: ReadonlyArray<SemanticModuleSuppressedBondRecord> = Array.empty()
const emptySuppressedBonds = Object.freeze(emptySuppressedBondValues)
const emptyProofValues: ReadonlyArray<SemanticModuleMembershipProofStep> = Array.empty()
const emptyProof = Object.freeze(emptyProofValues)
const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()
const emptyEntityDeclarations: ReadonlyArray<EntityDeclaration> = Array.empty()
const emptySymbols: ReadonlyArray<ts.Symbol> = Array.empty()
const emptyIdentifierOption = Option.none<ts.Identifier>()
const noIdentifier = Function.constant(emptyIdentifierOption)
const functionDeclarationKind = Function.constant("FunctionDeclaration" as const)
const classDeclarationKind = Function.constant("ClassDeclaration" as const)
const interfaceDeclarationKind = Function.constant("InterfaceDeclaration" as const)
const typeAliasDeclarationKind = Function.constant("TypeAliasDeclaration" as const)
const enumDeclarationKind = Function.constant("EnumDeclaration" as const)
const variableDeclarationKind = Function.constant("VariableDeclaration" as const)
const moduleDeclarationKind = Function.constant("ModuleDeclaration" as const)

const declarationKind = pipe(
  Match.type<EntityDeclaration>(),
  Match.when(ts.isFunctionDeclaration, functionDeclarationKind),
  Match.when(ts.isClassDeclaration, classDeclarationKind),
  Match.when(ts.isInterfaceDeclaration, interfaceDeclarationKind),
  Match.when(ts.isTypeAliasDeclaration, typeAliasDeclarationKind),
  Match.when(ts.isEnumDeclaration, enumDeclarationKind),
  Match.when(ts.isVariableDeclaration, variableDeclarationKind),
  Match.orElse(moduleDeclarationKind)
)

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

const bindingIdentifiers = (name: ts.BindingName): ReadonlyArray<ts.Identifier> => {
  if (ts.isIdentifier(name)) {
    return Array.of(name)
  }

  const identifiersForElement = (
    element: ts.ArrayBindingElement | ts.BindingElement
  ): ReadonlyArray<ts.Identifier> =>
    ts.isBindingElement(element) ? bindingIdentifiers(element.name) : Array.empty()

  return Array.flatMap(name.elements, identifiersForElement)
}

const symbolOwnsIdentifier = (identifier: ts.Identifier) => (symbol: ts.Symbol) => {
  const declarations = symbol.declarations ?? emptyDeclarations

  const isIdentifierParent = (declaration: ts.Node) =>
    nodeEquivalence(identifier.parent, declaration)

  return Array.some(declarations, isIdentifierParent)
}

const symbolForIdentifier =
  (checker: ts.TypeChecker) =>
  (identifier: ts.Identifier): Option.Option<ts.Symbol> => {
    if (strictEqual("")(identifier.text)) {
      return Option.none()
    }

    const hasIdentifierName = Function.flow(
      (symbol: ts.Symbol) => symbol.getName(),
      strictEqual(identifier.text)
    )

    const localSymbol = pipe(
      checker.getSymbolsInScope(identifier, ts.SymbolFlags.All),
      Array.filter(hasIdentifierName),
      Array.findFirst(symbolOwnsIdentifier(identifier))
    )

    return pipe(
      localSymbol,
      Option.orElse(() => resolvedSymbolAt(checker)(identifier))
    )
  }

const defaultDeclarationSymbol =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (declaration: EntityDeclaration): Option.Option<ts.Symbol> => {
    const isDefaultSymbol = Function.flow(
      (symbol: ts.Symbol) => symbol.getName(),
      strictEqual("default")
    )

    const ownsDeclaration = (symbol: ts.Symbol) => {
      const declarations = symbol.declarations ?? emptyDeclarations
      const isDeclaration = (candidate: ts.Node) => nodeEquivalence(declaration, candidate)

      return Array.some(declarations, isDeclaration)
    }

    return pipe(
      checker.getSymbolAtLocation(sourceFile),
      Option.fromNullishOr,
      Option.map((moduleSymbol) => checker.getExportsOfModule(moduleSymbol)),
      Option.map(Array.filter(isDefaultSymbol)),
      Option.flatMap(Array.findFirst(ownsDeclaration))
    )
  }

const symbolsForBindingName =
  (checker: ts.TypeChecker) =>
  (name: ts.BindingName): ReadonlyArray<ts.Symbol> => {
    const identifiers = bindingIdentifiers(name)
    const symbolsForIdentifier = Function.flow(symbolForIdentifier(checker), Option.toArray)

    return Array.flatMap(identifiers, symbolsForIdentifier)
  }

const optionalDeclarationName = (declaration: ts.FunctionDeclaration | ts.ClassDeclaration) =>
  Option.fromNullishOr(declaration.name)

const requiredDeclarationName = (
  declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration
) => Option.some(declaration.name)

const nestedDeclarationName = pipe(
  Match.type<ts.Statement>(),
  Match.when(ts.isFunctionDeclaration, optionalDeclarationName),
  Match.when(ts.isClassDeclaration, optionalDeclarationName),
  Match.when(ts.isInterfaceDeclaration, requiredDeclarationName),
  Match.when(ts.isTypeAliasDeclaration, requiredDeclarationName),
  Match.when(ts.isEnumDeclaration, requiredDeclarationName),
  Match.orElse(noIdentifier)
)

const isModuleDeclarationBody = (body: ts.ModuleBody): body is ts.NamespaceDeclaration =>
  strictEqual(ts.SyntaxKind.ModuleDeclaration)(body.kind)

const dedupeSymbols = (symbols: ReadonlyArray<ts.Symbol>) =>
  Array.dedupeWith(symbols, symbolEquivalence)

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
      Match.type<ts.ModuleBody>(),
      Match.when(ts.isModuleBlock, symbolsInModuleBlock),
      Match.when(isModuleDeclarationBody, symbolsForModule(checker)(sourceFile)),
      Match.orElse(Function.constant(emptySymbols))
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

const symbolsForOptionalDeclaration =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (declaration: ts.FunctionDeclaration | ts.ClassDeclaration): ReadonlyArray<ts.Symbol> =>
    pipe(
      declaration.name,
      Option.fromNullishOr,
      Option.flatMap(symbolForIdentifier(checker)),
      Option.orElse(() => defaultDeclarationSymbol(checker)(sourceFile)(declaration)),
      Option.toArray
    )

const symbolsForRequiredDeclaration =
  (checker: ts.TypeChecker) =>
  (
    declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration
  ): ReadonlyArray<ts.Symbol> =>
    pipe(declaration.name, symbolForIdentifier(checker), Option.toArray)

const variableSymbols = (checker: ts.TypeChecker) =>
  Function.flow(Struct.get<ts.VariableDeclaration, "name">("name"), symbolsForBindingName(checker))

const symbolsForDeclaration =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (declaration: EntityDeclaration): ReadonlyArray<ts.Symbol> =>
    pipe(
      Match.value(declaration),
      Match.when(ts.isVariableDeclaration, variableSymbols(checker)),
      Match.when(ts.isModuleDeclaration, symbolsForModule(checker)(sourceFile)),
      Match.when(ts.isFunctionDeclaration, symbolsForOptionalDeclaration(checker)(sourceFile)),
      Match.when(ts.isClassDeclaration, symbolsForOptionalDeclaration(checker)(sourceFile)),
      Match.when(ts.isInterfaceDeclaration, symbolsForRequiredDeclaration(checker)),
      Match.when(ts.isTypeAliasDeclaration, symbolsForRequiredDeclaration(checker)),
      Match.when(ts.isEnumDeclaration, symbolsForRequiredDeclaration(checker)),
      Match.exhaustive
    )

const moduleDisplayName = (declaration: ts.ModuleDeclaration | ts.NamespaceDeclaration): string => {
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
  Match.type<EntityDeclaration>(),
  Match.when(ts.isVariableDeclaration, variableDisplayName),
  Match.when(ts.isModuleDeclaration, moduleDisplayName),
  Match.when(ts.isFunctionDeclaration, defaultFunctionDisplayName),
  Match.when(ts.isClassDeclaration, defaultClassDisplayName),
  Match.when(ts.isInterfaceDeclaration, requiredDisplayText),
  Match.when(ts.isTypeAliasDeclaration, requiredDisplayText),
  Match.orElse(requiredDisplayText)
)

const candidateDeclarations = Struct.get<EntityCandidate, "declarations">("declarations")
const candidateSymbols = Struct.get<EntityCandidate, "ownedSymbols">("ownedSymbols")

const makeCandidate =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile) =>
  (declarations: ReadonlyArray<EntityDeclaration>): EntityCandidate => {
    const symbols = pipe(
      declarations,
      Array.flatMap(symbolsForDeclaration(checker)(sourceFile)),
      dedupeSymbols
    )

    const ownedSymbols = Object.freeze(symbols)

    return new EntityCandidate({ declarations, ownedSymbols })
  }

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

const singletonEntityDeclaration = Array.of<EntityDeclaration>

const variableStatementDeclarations = Function.flow(
  Struct.get<ts.VariableStatement, "declarationList">("declarationList"),
  Struct.get("declarations")
)

const declarationsForStatement = pipe(
  Match.type<ts.Statement>(),
  Match.when(ts.isVariableStatement, variableStatementDeclarations),
  Match.when(ts.isClassDeclaration, singletonEntityDeclaration),
  Match.when(ts.isInterfaceDeclaration, singletonEntityDeclaration),
  Match.when(ts.isTypeAliasDeclaration, singletonEntityDeclaration),
  Match.when(ts.isEnumDeclaration, singletonEntityDeclaration),
  Match.when(ts.isModuleDeclaration, singletonEntityDeclaration),
  Match.orElse(Function.constant(emptyEntityDeclarations))
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
  Struct.get<ts.ModifierLike, "kind">("kind"),
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

const ambientDeclarationNode = (declaration: EntityDeclaration): ts.Node =>
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
  (reason: SemanticModuleExclusionRecord["reason"]) =>
  (candidate: EntityCandidate): SemanticModuleExclusionRecord => {
    const anchor = pipe(candidate, candidateAnchor(sourcePath))

    return SemanticModuleExclusionRecord.make({ anchor, reason })
  }

const makeEntity =
  (context: ProgramMatchContext) =>
  (sourceFile: ts.SourceFile) =>
  (sourcePath: string) =>
  (candidate: EntityCandidate): SemanticModuleEntityRecord => {
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

    return SemanticModuleEntityRecord.make({
      key,
      declarationAnchors,
      stratum,
      displayName,
      declarationKind: kind
    })
  }

const candidateHasNoSymbols = Function.flow(
  candidateSymbols,
  Struct.get<ReadonlyArray<ts.Symbol>, "length">("length"),
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

const freezeExclusionRecord = (exclusion: SemanticModuleExclusionRecord) => {
  Object.freeze(exclusion.anchor)

  return Object.freeze(exclusion)
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
  Array.forEach(snapshot.exclusions, freezeExclusionRecord)
  Object.freeze(snapshot.entities)
  Object.freeze(snapshot.modules)
  Object.freeze(snapshot.acceptedBonds)
  Object.freeze(snapshot.suppressedBonds)
  Object.freeze(snapshot.exclusions)

  return Object.freeze(snapshot)
}

const normalizedEntities = Struct.get<SourceNormalization, "entities">("entities")
const normalizedExclusions = Struct.get<SourceNormalization, "exclusions">("exclusions")

export const buildSemanticModuleSnapshot = (
  context: ProgramMatchContext
): SemanticModuleSnapshotV1 => {
  const normalizedSources = Array.map(context.sourceFiles, makeSourceNormalization(context))

  const entityValues = pipe(
    normalizedSources,
    Array.flatMap(normalizedEntities),
    Array.sort(entityRecordOrder)
  )

  const exclusionValues = pipe(
    normalizedSources,
    Array.flatMap(normalizedExclusions),
    Array.sort(exclusionOrder)
  )

  const entities = Object.freeze(entityValues)
  const moduleValues = Array.map(entities, singletonModule)
  const modules = Object.freeze(moduleValues)
  const exclusions = Object.freeze(exclusionValues)

  const snapshot = SemanticModuleSnapshotV1.make({
    entities,
    modules,
    acceptedBonds: emptyAcceptedBonds,
    suppressedBonds: emptySuppressedBonds,
    exclusions
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
