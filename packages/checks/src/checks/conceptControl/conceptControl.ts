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
  Result
} from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { definePlannedCheck } from "../../defineCheck.js"
import { buildConceptIndex, functionDerivedStem } from "./conceptIndex.js"
import {
  type ReferenceKey,
  referenceKey,
  referenceKeySourceFileName
} from "../support/referenceKey.js"
import { fileSubscriptions, detection } from "@better-typescript/core/engine/check"
import {
  ConceptSignalData,
  type ConceptIndex,
  type ConceptSignalKind,
  type DataStructureEntry,
  type FunctionEntry,
  type ModelRole
} from "./data.js"

const derivedAliasUtilities = HashSet.make("Omit", "Partial", "Pick", "Readonly", "Required")

const rationaleHint =
  "Delete or reuse this concept before documenting it. If it remains, add one single-line " +
  "comment directly above the declaration explaining because why existing concepts are " +
  "insufficient. The prose does not suppress structural evidence."

const closedHint =
  "Collapse the function and its private data vocabulary into their external owner, reuse an " +
  "existing concept, or deepen the Module until the abstraction has independent leverage. Do " +
  "not replace the named model with an anonymous object type."

const duplicateHint =
  "Reuse the existing data structure or merge the concepts. Keep a distinct representation only " +
  "for an independently evolving boundary or invariant, and retain the duplicate evidence for review."

const conceptControlSubscriptions = (index: ConceptIndex) => {
  const entryOrder = Order.mapInput(
    Order.String,
    (entry: DataStructureEntry) => `${entry.sourceFile.fileName}:${entry.name}`
  )

  const matches = (context: CheckContext): ReadonlyArray<Detection> => {
    const checker = context.checker
    const match = detection(context)
    const found = MutableList.make<Detection>()

    const entries = Array.filter(
      index.dataStructures,
      (entry) => entry.sourceFile === context.sourceFile
    )

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

    const signalData = (
      kind: ConceptSignalKind,
      entry: DataStructureEntry,
      owner: string,
      relatedConcepts: ReadonlyArray<string>,
      externalCallers: number
    ) => {
      const owners = ownersFor(entry)
      const independentOwners = HashSet.size(owners)

      return new ConceptSignalData({
        kind,
        concept: entry.name,
        owner,
        independentOwners,
        externalCallers,
        relatedConcepts
      })
    }

    const append = (node: ts.Node, message: string, hint: string, data: ConceptSignalData) => {
      const element = match({ node, message, hint, data })

      MutableList.append(found, element)

      return element
    }

    const canonicalSymbol = (symbol: ts.Symbol) =>
      (symbol.flags & ts.SymbolFlags.Alias) === 0 ? symbol : checker.getAliasedSymbol(symbol)

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
        const isEmpty = declaration.members.length === 0
        const hasSingleHeritage = types.length === 1
        const emptyInterfaceAlias = isEmpty && hasSingleHeritage

        return emptyInterfaceAlias ? modelAt(types[0].expression) : Option.none()
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

        const ownersStayInsideCluster = HashSet.every(owners, (owner) =>
          HashSet.has(allowedOwners, owner)
        )

        const clusterConditions = Array.make(hasAtMostOneExternalOwner, ownersStayInsideCluster)

        return Array.every(clusterConditions, Boolean)
      })
    }

    const duplicateTarget = (entry: DataStructureEntry) =>
      pipe(
        entry.shape,
        Option.flatMap((shape) => HashMap.get(index.shapeGroups, shape)),
        Option.filter((group) => group.length > 1),
        Option.map((group) => Array.sort(group, entryOrder)),
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

      const declarationOwner = pipe(
        referenceKeySourceFileName(owner),
        Option.flatMap((fileName) =>
          pipe(context.program.getSourceFile(fileName), Option.fromNullishOr)
        )
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

      const lineRanges = Array.filter(
        leadingRanges,
        (range) => range.kind === ts.SyntaxKind.SingleLineCommentTrivia
      )

      const prose = pipe(
        lineRanges,
        Array.map((range) => sourceText.slice(range.pos + 2, range.end).trim()),
        Array.join(" ")
      )

      return prose.toLowerCase().includes("because")
    }

    const redundantPairs = Array.filterMap(entries, (entry) =>
      pipe(
        redundantTarget(entry),
        Option.map((target) => Tuple.make(entry, target)),
        Result.fromOption(Function.constVoid)
      )
    )

    const redundantSymbols = pipe(
      redundantPairs,
      Array.map(([entry]) => referenceKey(entry.symbol)),
      HashSet.fromIterable
    )

    const closedPairs = Array.filterMap(entries, (entry) => {
      const entryKey = referenceKey(entry.symbol)

      return HashSet.has(redundantSymbols, entryKey)
        ? Result.failVoid
        : pipe(
            closedOwner(entry),
            Option.map((owner) => Tuple.make(entry, owner)),
            Result.fromOption(Function.constVoid)
          )
    })

    const closedSymbols = pipe(
      closedPairs,
      Array.map(([entry]) => referenceKey(entry.symbol)),
      HashSet.fromIterable
    )

    const duplicatePairs = Array.filterMap(entries, (entry) => {
      const entryKey = referenceKey(entry.symbol)
      const excluded = HashSet.has(closedSymbols, entryKey)
      const isRedundant = HashSet.has(redundantSymbols, entryKey)
      const exclusions = Array.make(excluded, isRedundant)
      const isExcluded = Array.some(exclusions, Boolean)

      return isExcluded
        ? Result.failVoid
        : pipe(
            duplicateTarget(entry),
            Option.map((target) => Tuple.make(entry, target)),
            Result.fromOption(Function.constVoid)
          )
    })

    const duplicateSymbols = pipe(
      duplicatePairs,
      Array.map(([entry]) => referenceKey(entry.symbol)),
      HashSet.fromIterable
    )

    Array.forEach(closedPairs, ([entry, owner]) => {
      const callers = callersFor(owner)
      const relatedConcepts = Array.of(owner.name)
      const externalCallers = HashSet.size(callers)

      const data = signalData(
        "closed-abstraction",
        entry,
        owner.name,
        relatedConcepts,
        externalCallers
      )

      append(
        entry.nameNode,
        `${entry.name} and ${owner.name} form a closed abstraction with at most one external owner.`,
        closedHint,
        data
      )
    })

    Array.forEach(redundantPairs, ([entry, target]) => {
      const relatedConcepts = Array.of(target.name)
      const data = signalData("redundant-alias", entry, target.name, relatedConcepts, 0)

      append(
        entry.nameNode,
        `${entry.name} renames ${target.name} without adding independent semantics.`,
        `Use ${target.name} directly, merge the concepts, or add a real invariant or independently evolving boundary. Do not keep a second name only to describe structural use.`,
        data
      )
    })

    Array.forEach(duplicatePairs, ([entry, target]) => {
      const relatedConcepts = Array.of(target.name)
      const data = signalData("duplicate-shape", entry, target.name, relatedConcepts, 0)

      append(
        entry.nameNode,
        `${entry.name} duplicates the concrete structure of ${target.name}.`,
        duplicateHint,
        data
      )
    })

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

      const matchingOwner = pipe(
        stem,
        Option.flatMap((value) =>
          Array.findFirst(
            modelFunctions,
            (owner) => owner.name.toLowerCase() === value.toLowerCase()
          )
        )
      )

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

          const ownersStayInsideCluster = HashSet.every(owners, (candidate) =>
            HashSet.has(allowedOwners, candidate)
          )

          if (!ownersStayInsideCluster) {
            return Option.none()
          }

          const emission = Tuple.make(owner, callers)

          return Option.some(emission)
        })
      )

      if (Option.isSome(functionDerivedEmission)) {
        const [owner, callers] = functionDerivedEmission.value
        const relatedConcepts = Array.of(owner.name)
        const externalCallers = HashSet.size(callers)

        const data = signalData(
          "function-derived-model",
          entry,
          owner.name,
          relatedConcepts,
          externalCallers
        )

        append(
          entry.nameNode,
          `${entry.name} is named after its sole function role instead of independent semantics.`,
          "Remove or deepen the function-data abstraction, or replace this structural-role name with an existing domain concept. A new name must mean more than input, output, options, context, state, or result for one function.",
          data
        )
        return
      }

      const externalOwners = pipe(
        owners,
        Array.fromIterable,
        Array.filterMap(Function.flow(ownerSourceFile, Result.fromOption(Function.constVoid))),
        Array.filter((sourceFile) => sourceFile !== entry.sourceFile)
      )

      const hasNoExternalOwners = externalOwners.length === 0
      const isExportedWithoutConsumers = entry.exported && hasNoExternalOwners
      const speculative = isExportedWithoutConsumers && roleNotExempt

      if (speculative) {
        const relatedConcepts = Array.empty<string>()
        const data = signalData("speculative-export", entry, "", relatedConcepts, 0)

        append(
          entry.nameNode,
          `${entry.name} is exported without an independent first-party consumer or established boundary.`,
          "Remove the export and keep ownership local, or connect the model to an intentional public seam. Exporting a declaration does not establish reuse and must not evade abstraction analysis.",
          data
        )
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
          const data = signalData("unused-field", entry, "", relatedConcepts, 0)

          append(
            declaration,
            `${entry.name}.${fieldName} is constructed but never independently read.`,
            "Delete the speculative field or connect it to behavior that consumes its semantics. Mechanical forwarding into another representation is not a read and instead indicates parallel concepts.",
            data
          )
        })
        return
      }

      if (!rationaleIsComplete(entry)) {
        const relatedConcepts = Array.empty<string>()
        const data = signalData("missing-rationale", entry, "", relatedConcepts, 0)

        append(
          entry.nameNode,
          `${entry.name} lacks a complete, structurally supported data-structure rationale.`,
          rationaleHint,
          data
        )
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
      Array.map((entry) => referenceKey(entry.symbol)),
      HashSet.fromIterable
    )

    pipe(
      index.parameterBags,
      Array.filter((bag) => bag.node.getSourceFile() === context.sourceFile),
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

        const data = signalData(
          "parameter-bag",
          bag.model,
          bag.functionEntry.name,
          relatedConcepts,
          externalCallers
        )

        append(
          bag.node,
          `${bag.model.name} is constructed only to cross the ${bag.functionEntry.name} call seam.`,
          "Remove or deepen the function seam, reuse existing domain values, or make this model a genuine command with independent semantics. Do not explode it into primitive parameters or an anonymous object type.",
          data
        )
      })
    )

    pipe(
      index.passThroughConversions,
      Array.filter((conversion) => conversion.node.getSourceFile() === context.sourceFile),
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

        const data = signalData(
          "pass-through-conversion",
          conversion.target,
          conversion.functionEntry.name,
          related,
          externalCallers
        )

        append(
          conversion.node,
          `${conversion.functionEntry.name} copies ${conversion.source.name} into ${conversion.target.name} without transformation.`,
          "Collapse the parallel representations or document and preserve the real boundary that requires both. A field-for-field adapter is evidence against introducing another first-party concept.",
          data
        )
      })
    )

    return MutableList.toArray(found)
  }

  return fileSubscriptions(matches)
}

const conceptControlPlan = Function.compose(buildConceptIndex, conceptControlSubscriptions)

export const conceptControl = definePlannedCheck("concept-control", conceptControlPlan)
