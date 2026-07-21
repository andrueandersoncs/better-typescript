import {
  Array,
  Function,
  HashMap,
  HashSet,
  MutableList,
  Option,
  Order,
  Struct,
  pipe,
  Tuple,
  Result,
  flow
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { nodeMatch, type Match, type MatchContext } from "@better-typescript/matchers/matcher/data"
import {
  fileSubscriptions,
  makeMatcherFromSubscriptions
} from "@better-typescript/matchers/matcher"
import { buildConceptIndex, functionDerivedStem } from "./conceptIndex.js"
import {
  type ReferenceKey,
  referenceKey,
  referenceKeySourceFileName
} from "../../support/referenceKey.js"
import {
  ConceptSignalData,
  type ConceptIndex,
  type ConceptSignalKind,
  type DataStructureEntry,
  type FunctionEntry,
  type ModelRole,
  type ParameterBag,
  type PassThroughConversion
} from "./data.js"

const derivedAliasUtilities = HashSet.make("Omit", "Partial", "Pick", "Readonly", "Required")

const conceptControlSubscriptions = (index: ConceptIndex) => {
  const entryOrder = Order.mapInput(
    Order.String,
    (entry: DataStructureEntry) => `${entry.sourceFile.fileName}:${entry.name}`
  )

  const matches = (context: MatchContext): ReadonlyArray<Match<ConceptSignalData>> => {
    const checker = context.checker
    const found = MutableList.make<Match<ConceptSignalData>>()

    const entryInSourceFile = flow(
      Struct.get<DataStructureEntry, "sourceFile">("sourceFile"),
      strictEqual(context.sourceFile)
    )

    const entries = Array.filter(index.dataStructures, entryInSourceFile)

    const rolesFor = (entry: DataStructureEntry): HashSet.HashSet<ModelRole> => {
      const symbolKey = referenceKey(entry.symbol)

      return pipe(HashMap.get(index.rolesByData, symbolKey), Option.getOrElse(HashSet.empty))
    }

    const ownersFor = (entry: DataStructureEntry): HashSet.HashSet<ReferenceKey<ts.Symbol>> => {
      const symbolKey = referenceKey(entry.symbol)

      return pipe(HashMap.get(index.ownersByData, symbolKey), Option.getOrElse(HashSet.empty))
    }

    const functionOwners = (entry: DataStructureEntry): ReadonlyArray<FunctionEntry> =>
      pipe(
        ownersFor(entry),
        Array.fromIterable,
        Array.filterMap((owner) => {
          const functionOption = HashMap.get(index.functionBySymbol, owner)

          return Result.fromOption(functionOption, Function.constVoid)
        })
      )

    const callersFor = (entry: FunctionEntry): HashSet.HashSet<ReferenceKey<ts.Symbol>> => {
      const symbolKey = referenceKey(entry.symbol)

      return pipe(HashMap.get(index.ownersByFunction, symbolKey), Option.getOrElse(HashSet.empty))
    }

    const makeSignalData = (
      kind: ConceptSignalKind,
      entry: DataStructureEntry,
      owner: string,
      relatedConcepts: ReadonlyArray<string>,
      externalCallers: number
    ) => {
      const owners = ownersFor(entry)
      const independentOwners = HashSet.size(owners)

      return ConceptSignalData.make({
        kind,
        concept: entry.name,
        owner,
        independentOwners,
        externalCallers,
        relatedConcepts
      })
    }

    const append = (node: ts.Node, data: ConceptSignalData) => {
      const element = nodeMatch(node, data)

      MutableList.append(found, element)

      return element
    }

    const canonicalSymbol = (symbol: ts.Symbol) =>
      strictEqual(0)(symbol.flags & ts.SymbolFlags.Alias)
        ? symbol
        : checker.getAliasedSymbol(symbol)

    const modelAt = (node: ts.Node) =>
      pipe(
        checker.getSymbolAtLocation(node),
        Option.fromNullishOr,
        Option.map(canonicalSymbol),
        Option.flatMap((symbol) => {
          const symbolKey = referenceKey(symbol)

          return HashMap.get(index.dataBySymbol, symbolKey)
        })
      )

    const redundantTarget = (entry: DataStructureEntry): Option.Option<DataStructureEntry> => {
      const declaration = entry.declaration

      if (ts.isInterfaceDeclaration(declaration)) {
        const emptyClauses = Array.empty<ts.HeritageClause>()
        const clauses = declaration.heritageClauses ?? emptyClauses
        const types = Array.flatMap(clauses, Struct.get("types"))
        const isEmpty = strictEqual(0)(declaration.members.length)
        const hasSingleHeritage = strictEqual(1)(types.length)
        const emptyInterfaceAlias = isEmpty && hasSingleHeritage

        return emptyInterfaceAlias
          ? pipe(Array.head(types), Option.map(Struct.get("expression")), Option.flatMap(modelAt))
          : Option.none()
      }

      if (!ts.isTypeAliasDeclaration(declaration)) {
        return Option.none()
      }

      const type = declaration.type

      if (!ts.isTypeReferenceNode(type)) {
        return Option.none()
      }

      const direct = modelAt(type.typeName)

      if (Option.isSome(direct)) {
        return direct
      }

      const utilityName = type.typeName.getText()
      const isDerivedUtility = HashSet.has(derivedAliasUtilities, utilityName)
      const owners = ownersFor(entry)
      const isSingleOwner = HashSet.size(owners) <= 1
      const derivedConditions = Array.make(isDerivedUtility, isSingleOwner)
      const isRedundantDerived = Array.every(derivedConditions, Boolean)

      if (!isRedundantDerived) {
        return Option.none()
      }

      const emptyTypeArguments = Array.empty<ts.TypeNode>()
      const typeArguments = type.typeArguments ?? emptyTypeArguments

      return pipe(typeArguments, Array.head, Option.flatMap(modelAt))
    }

    const closedOwner = (entry: DataStructureEntry): Option.Option<FunctionEntry> => {
      const roles = rolesFor(entry)

      if (HashSet.size(roles) > 0) {
        return Option.none()
      }

      const owners = ownersFor(entry)
      const candidates = functionOwners(entry)

      return Array.findFirst(candidates, (candidate) => {
        const callers = callersFor(candidate)
        const candidateKey = referenceKey(candidate.symbol)
        const allowedOwners = pipe(callers, HashSet.add(candidateKey))
        const hasAtMostOneExternalOwner = HashSet.size(callers) <= 1
        const ownerInAllowed = (owner: ReferenceKey<ts.Symbol>) => HashSet.has(allowedOwners, owner)
        const ownersStayInsideCluster = HashSet.every(owners, ownerInAllowed)
        const clusterConditions = Array.make(hasAtMostOneExternalOwner, ownersStayInsideCluster)

        return Array.every(clusterConditions, Boolean)
      })
    }

    const shapeGroup = (shape: string) => HashMap.get(index.shapeGroups, shape)

    const sortByEntryOrder = (group: ReadonlyArray<DataStructureEntry>) =>
      Array.sort(group, entryOrder)

    const duplicateTarget = (entry: DataStructureEntry) =>
      pipe(
        entry.shape,
        Option.flatMap(shapeGroup),
        Option.filter((group) => group.length > 1),
        Option.map(sortByEntryOrder),
        Option.flatMap(Array.head),
        Option.filter((canonical) => canonical.symbol !== entry.symbol)
      )

    const ownerSourceFile = (owner: ReferenceKey<ts.Symbol>) => {
      const functionOwner = pipe(
        HashMap.get(index.functionBySymbol, owner),
        Option.map(Struct.get("sourceFile"))
      )

      const dataOwner = pipe(
        HashMap.get(index.dataBySymbol, owner),
        Option.map(Struct.get("sourceFile"))
      )

      const sourceFileForName = (fileName: string) =>
        pipe(context.program.getSourceFile(fileName), Option.fromNullishOr)

      const declarationOwner = pipe(
        referenceKeySourceFileName(owner),
        Option.flatMap(sourceFileForName)
      )

      return pipe(
        functionOwner,
        Option.orElse(Function.constant(dataOwner)),
        Option.orElse(Function.constant(declarationOwner))
      )
    }

    const rationaleIsComplete = (entry: DataStructureEntry) => {
      const sourceText = entry.sourceFile.getFullText()
      const emptyRanges = Array.empty<ts.CommentRange>()

      const leadingRanges = pipe(
        ts.getLeadingCommentRanges(sourceText, entry.documentationNode.pos),
        Option.fromNullishOr,
        Option.getOrElse(Function.constant(emptyRanges))
      )

      const rangeIsSingleLineComment = flow(
        Struct.get<ts.CommentRange, "kind">("kind"),
        strictEqual(ts.SyntaxKind.SingleLineCommentTrivia)
      )

      const lineRanges = Array.filter(leadingRanges, rangeIsSingleLineComment)

      const commentProse = (range: ts.CommentRange) =>
        sourceText.slice(range.pos + 2, range.end).trim()

      const prose = pipe(lineRanges, Array.map(commentProse), Array.join(" "))

      return prose.toLowerCase().includes("because")
    }

    const pairWithRedundantTarget = (entry: DataStructureEntry) => {
      const pairWithEntry = (target: DataStructureEntry) => Tuple.make(entry, target)

      return pipe(
        redundantTarget(entry),
        Option.map(pairWithEntry),
        Result.fromOption(Function.constVoid)
      )
    }

    const redundantPairs = Array.filterMap(entries, pairWithRedundantTarget)
    const entrySymbolKey = (entry: DataStructureEntry) => referenceKey(entry.symbol)

    const pairEntrySymbolKey = (
      pair: readonly [DataStructureEntry, DataStructureEntry | FunctionEntry]
    ) => pipe(pair, Tuple.get(0), entrySymbolKey)

    const redundantSymbols = pipe(
      redundantPairs,
      Array.map(pairEntrySymbolKey),
      HashSet.fromIterable
    )

    const closedPairs = Array.filterMap(entries, (entry) => {
      const entryKey = referenceKey(entry.symbol)
      const pairWithEntry = (owner: FunctionEntry) => Tuple.make(entry, owner)

      return HashSet.has(redundantSymbols, entryKey)
        ? Result.failVoid
        : pipe(closedOwner(entry), Option.map(pairWithEntry), Result.fromOption(Function.constVoid))
    })

    const closedSymbols = pipe(closedPairs, Array.map(pairEntrySymbolKey), HashSet.fromIterable)

    const duplicatePairs = Array.filterMap(entries, (entry) => {
      const entryKey = referenceKey(entry.symbol)
      const excluded = HashSet.has(closedSymbols, entryKey)
      const isRedundant = HashSet.has(redundantSymbols, entryKey)
      const exclusions = Array.make(excluded, isRedundant)
      const isExcluded = Array.some(exclusions, Boolean)
      const pairWithEntry = (target: DataStructureEntry) => Tuple.make(entry, target)

      return isExcluded
        ? Result.failVoid
        : pipe(
            duplicateTarget(entry),
            Option.map(pairWithEntry),
            Result.fromOption(Function.constVoid)
          )
    })

    const duplicateSymbols = pipe(
      duplicatePairs,
      Array.map(pairEntrySymbolKey),
      HashSet.fromIterable
    )

    const emitClosedPair = (pair: readonly [DataStructureEntry, FunctionEntry]) => {
      const entry = Tuple.get(pair, 0)
      const owner = Tuple.get(pair, 1)
      const callers = callersFor(owner)
      const relatedConcepts = Array.of(owner.name)
      const externalCallers = HashSet.size(callers)

      const data = makeSignalData(
        "closed-abstraction",
        entry,
        owner.name,
        relatedConcepts,
        externalCallers
      )

      return append(entry.nameNode, data)
    }

    Array.forEach(closedPairs, emitClosedPair)

    const emitRedundantPair = (pair: readonly [DataStructureEntry, DataStructureEntry]) => {
      const entry = Tuple.get(pair, 0)
      const target = Tuple.get(pair, 1)
      const relatedConcepts = Array.of(target.name)
      const data = makeSignalData("redundant-alias", entry, target.name, relatedConcepts, 0)

      return append(entry.nameNode, data)
    }

    Array.forEach(redundantPairs, emitRedundantPair)

    const emitDuplicatePair = (pair: readonly [DataStructureEntry, DataStructureEntry]) => {
      const entry = Tuple.get(pair, 0)
      const target = Tuple.get(pair, 1)
      const relatedConcepts = Array.of(target.name)
      const data = makeSignalData("duplicate-shape", entry, target.name, relatedConcepts, 0)

      return append(entry.nameNode, data)
    }

    Array.forEach(duplicatePairs, emitDuplicatePair)

    const readFields = pipe(index.fieldReads, Array.map(Struct.get("field")), HashSet.fromIterable)

    Array.forEach(entries, (entry) => {
      const entryKey = referenceKey(entry.symbol)
      const isClosed = HashSet.has(closedSymbols, entryKey)
      const isRedundant = HashSet.has(redundantSymbols, entryKey)
      const isDuplicate = HashSet.has(duplicateSymbols, entryKey)
      const structuralFlags = Array.make(isClosed, isRedundant, isDuplicate)
      const structurallyDecided = Array.some(structuralFlags, Boolean)

      if (structurallyDecided) {
        return
      }

      const roles = rolesFor(entry)
      const owners = ownersFor(entry)
      const modelFunctions = functionOwners(entry)
      const stem = functionDerivedStem(entry.name)

      const ownerMatchingStem = (value: string) => {
        const loweredValue = value.toLowerCase()

        const nameMatchesStem = flow(
          Struct.get<FunctionEntry, "name">("name"),
          (name) => name.toLowerCase(),
          strictEqual(loweredValue)
        )

        return Array.findFirst(modelFunctions, nameMatchesStem)
      }

      const matchingOwner = pipe(stem, Option.flatMap(ownerMatchingStem))
      const isBoundary = HashSet.has(roles, "boundary")
      const isProtocol = HashSet.has(roles, "protocol")
      const roleExemptFlags = Array.make(isBoundary, isProtocol)
      const roleExempt = Array.some(roleExemptFlags, Boolean)
      const roleNotExempt = !roleExempt

      const functionDerivedOwner = pipe(
        matchingOwner,
        Option.filter(Function.constant(roleNotExempt))
      )

      const functionDerivedEmission = pipe(
        functionDerivedOwner,
        Option.flatMap((owner) => {
          const callers = callersFor(owner)
          const ownerKey = referenceKey(owner.symbol)
          const allowedOwners = pipe(callers, HashSet.add(ownerKey))

          const ownerInAllowed = (candidate: ReferenceKey<ts.Symbol>) =>
            HashSet.has(allowedOwners, candidate)

          const ownersStayInsideCluster = HashSet.every(owners, ownerInAllowed)

          if (!ownersStayInsideCluster) {
            return Option.none()
          }

          const emission = Tuple.make(owner, callers)

          return Option.some(emission)
        })
      )

      if (Option.isSome(functionDerivedEmission)) {
        const emission = functionDerivedEmission.value
        const owner = Tuple.get(emission, 0)
        const callers = Tuple.get(emission, 1)
        const relatedConcepts = Array.of(owner.name)
        const externalCallers = HashSet.size(callers)

        const data = makeSignalData(
          "function-derived-model",
          entry,
          owner.name,
          relatedConcepts,
          externalCallers
        )

        append(entry.nameNode, data)
        return
      }

      const externalOwners = pipe(
        owners,
        Array.fromIterable,
        Array.filterMap(Function.flow(ownerSourceFile, Result.fromOption(Function.constVoid))),
        Array.filter((sourceFile) => sourceFile !== entry.sourceFile)
      )

      const hasNoExternalOwners = strictEqual(0)(externalOwners.length)
      const isExportedWithoutConsumers = entry.exported && hasNoExternalOwners
      const speculative = isExportedWithoutConsumers && roleNotExempt

      if (speculative) {
        const relatedConcepts = Array.empty<string>()
        const data = makeSignalData("speculative-export", entry, "", relatedConcepts, 0)

        append(entry.nameNode, data)
        return
      }

      const reflectsBoundary = HashSet.has(roles, "boundary")
      const reflectsProtocol = HashSet.has(roles, "protocol")
      const externalReflectionFlags = Array.make(reflectsBoundary, reflectsProtocol)
      const reflectsExternally = Array.some(externalReflectionFlags, Boolean)

      const unusedFields = reflectsExternally
        ? Array.empty<ts.Symbol>()
        : Array.filter(entry.fieldSymbols, (field) => {
            const fieldKey = referenceKey(field)
            const directlyRead = HashSet.has(readFields, fieldKey)
            const fieldName = field.getName()
            const functionallyRead = HashSet.has(index.readFieldNames, fieldName)
            const readChecks = Array.make(directlyRead, functionallyRead)

            return Array.every(readChecks, (read) => !read)
          })

      if (unusedFields.length > 0) {
        Array.forEach(unusedFields, (field) => {
          const emptyDeclarations = Array.empty<ts.Declaration>()
          const declarations = field.declarations ?? emptyDeclarations

          const declaration = pipe(
            declarations,
            Array.head,
            Option.getOrElse(Function.constant(entry.nameNode))
          )

          const fieldName = field.getName()
          const relatedConcepts = Array.of(fieldName)
          const data = makeSignalData("unused-field", entry, "", relatedConcepts, 0)

          append(declaration, data)
        })
        return
      }

      if (!rationaleIsComplete(entry)) {
        const relatedConcepts = Array.empty<string>()
        const data = makeSignalData("missing-rationale", entry, "", relatedConcepts, 0)

        append(entry.nameNode, data)
      }
    })

    const occupiedModels = pipe(
      entries,
      Array.filter((entry) => {
        const entryKey = referenceKey(entry.symbol)
        const isClosed = HashSet.has(closedSymbols, entryKey)
        const isRedundant = HashSet.has(redundantSymbols, entryKey)
        const isDuplicate = HashSet.has(duplicateSymbols, entryKey)
        const occupationFlags = Array.make(isClosed, isRedundant, isDuplicate)

        return Array.some(occupationFlags, Boolean)
      }),
      Array.map(entrySymbolKey),
      HashSet.fromIterable
    )

    const bagInSourceFile = flow(
      Struct.get<ParameterBag, "node">("node"),
      (node) => node.getSourceFile(),
      strictEqual(context.sourceFile)
    )

    pipe(
      index.parameterBags,
      Array.filter(bagInSourceFile),
      Array.filter((bag) => {
        const modelKey = referenceKey(bag.model.symbol)

        return !HashSet.has(occupiedModels, modelKey)
      }),
      Array.filter((bag) => {
        const roles = rolesFor(bag.model)
        const isBoundary = HashSet.has(roles, "boundary")
        const isInvariant = HashSet.has(roles, "invariant")
        const isProtocol = HashSet.has(roles, "protocol")
        const exemptions = Array.make(isBoundary, isInvariant, isProtocol)

        return Array.every(exemptions, (exempt) => !exempt)
      }),
      Array.forEach((bag) => {
        const relatedConcepts = Array.of(bag.functionEntry.name)
        const callers = callersFor(bag.functionEntry)
        const externalCallers = HashSet.size(callers)

        const data = makeSignalData(
          "parameter-bag",
          bag.model,
          bag.functionEntry.name,
          relatedConcepts,
          externalCallers
        )

        append(bag.node, data)
      })
    )

    const conversionInSourceFile = flow(
      Struct.get<PassThroughConversion, "node">("node"),
      (node) => node.getSourceFile(),
      strictEqual(context.sourceFile)
    )

    pipe(
      index.passThroughConversions,
      Array.filter(conversionInSourceFile),
      Array.filter((conversion) => {
        const sourceKey = referenceKey(conversion.source.symbol)
        const targetKey = referenceKey(conversion.target.symbol)
        const sourceOccupied = HashSet.has(occupiedModels, sourceKey)
        const targetOccupied = HashSet.has(occupiedModels, targetKey)
        const occupationFlags = Array.make(sourceOccupied, targetOccupied)

        return Array.every(occupationFlags, (occupied) => !occupied)
      }),
      Array.forEach((conversion) => {
        const related = Array.make(conversion.source.name, conversion.target.name)
        const callers = callersFor(conversion.functionEntry)
        const externalCallers = HashSet.size(callers)

        const data = makeSignalData(
          "pass-through-conversion",
          conversion.target,
          conversion.functionEntry.name,
          related,
          externalCallers
        )

        append(conversion.node, data)
      })
    )

    return MutableList.toArray(found)
  }

  return fileSubscriptions(matches)
}

const conceptControlPlan = Function.compose(buildConceptIndex, conceptControlSubscriptions)

export const conceptControlMatcher = makeMatcherFromSubscriptions(conceptControlPlan)
