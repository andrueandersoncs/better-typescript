import {
  Array,
  Function,
  HashMap,
  HashSet,
  MutableList,
  Option,
  Order,
  Struct,
  pipe
} from "effect"
import * as ts from "typescript"
import {
  fileSubscriptions,
  withProgramIndex
} from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { buildConceptIndex, functionDerivedStem } from "./conceptIndex.js"
import {
  ConceptSignalData,
  type ConceptIndex,
  type ConceptSignalKind,
  type DataStructureEntry,
  type FunctionEntry,
  type ModelRole
} from "./data.js"

const validModelRoles: HashSet.HashSet<ModelRole> = HashSet.make(
  "shared" as ModelRole,
  "boundary" as ModelRole,
  "invariant" as ModelRole,
  "protocol" as ModelRole,
  "recursive" as ModelRole
)

const derivedAliasUtilities = HashSet.make(
  "Omit",
  "Partial",
  "Pick",
  "Readonly",
  "Required"
)

const rationaleHint =
  "Delete or reuse this concept before documenting it. If it remains, add structured JSDoc " +
  "with a semantic description, exactly one @modelRole (shared, boundary, invariant, protocol, " +
  "or recursive), and @remarks that explain because why existing concepts are insufficient " +
  "and what concrete complexity would reappear when removing it. The prose does not suppress " +
  "structural evidence."

const closedHint =
  "Collapse the function and its private data vocabulary into their external owner, reuse an " +
  "existing concept, or deepen the Module until the abstraction has independent leverage. Do " +
  "not replace the named model with an anonymous object type."

const duplicateHint =
  "Reuse the existing data structure or merge the concepts. Keep a distinct representation only " +
  "for an independently evolving boundary or invariant, and retain the duplicate evidence for review."

const conceptControlSubscriptions = (index: ConceptIndex) => {
  const entryOrder = Order.mapInput(
    Order.string,
    (entry: DataStructureEntry) => `${entry.sourceFile.fileName}:${entry.name}`
  )

  const matches = (context: CheckContext): ReadonlyArray<Detection> => {
    const checker = context.checker
    const match = detection(context)
    const found = MutableList.empty<Detection>()
    const entries = Array.filter(
      index.dataStructures,
      (entry) => entry.sourceFile === context.sourceFile
    )
    const rolesFor = (entry: DataStructureEntry): HashSet.HashSet<ModelRole> =>
      pipe(
        HashMap.get(index.rolesByData, entry.symbol),
        Option.getOrElse(HashSet.empty)
      )
    const ownersFor = (entry: DataStructureEntry): HashSet.HashSet<ts.Symbol> =>
      pipe(
        HashMap.get(index.ownersByData, entry.symbol),
        Option.getOrElse(HashSet.empty)
      )
    const functionOwners = (
      entry: DataStructureEntry
    ): ReadonlyArray<FunctionEntry> =>
      pipe(
        ownersFor(entry),
        Array.fromIterable,
        Array.filterMap((owner) => HashMap.get(index.functionBySymbol, owner))
      )
    const callersFor = (entry: FunctionEntry): HashSet.HashSet<ts.Symbol> =>
      pipe(
        HashMap.get(index.ownersByFunction, entry.symbol),
        Option.getOrElse(HashSet.empty)
      )
    const signalData = (
      kind: ConceptSignalKind,
      entry: DataStructureEntry,
      owner: string,
      relatedConcepts: ReadonlyArray<string>,
      externalCallers: number
    ): ConceptSignalData =>
      new ConceptSignalData({
        kind,
        concept: entry.name,
        owner,
        independentOwners: HashSet.size(ownersFor(entry)),
        externalCallers,
        relatedConcepts
      })
    const append = (
      node: ts.Node,
      message: string,
      hint: string,
      data: ConceptSignalData
    ): void => {
      const element = match({ node, message, hint, data })

      MutableList.append(found, element)
    }
    const canonicalSymbol = (symbol: ts.Symbol): ts.Symbol =>
      (symbol.flags & ts.SymbolFlags.Alias) === 0
        ? symbol
        : checker.getAliasedSymbol(symbol)
    const modelAt = (node: ts.Node): Option.Option<DataStructureEntry> =>
      pipe(
        checker.getSymbolAtLocation(node),
        Option.fromNullable,
        Option.map(canonicalSymbol),
        Option.flatMap((symbol) => HashMap.get(index.dataBySymbol, symbol))
      )
    const redundantTarget = (
      entry: DataStructureEntry
    ): Option.Option<DataStructureEntry> => {
      const declaration = entry.declaration

      if (ts.isInterfaceDeclaration(declaration)) {
        const clauses = declaration.heritageClauses ?? Array.empty()
        const types = Array.flatMap(clauses, Struct.get("types"))
        const isEmpty = declaration.members.length === 0

        return isEmpty && types.length === 1
          ? modelAt(types[0].expression)
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

      return isRedundantDerived
        ? pipe(
            type.typeArguments ?? Array.empty(),
            Array.head,
            Option.flatMap(modelAt)
          )
        : Option.none()
    }
    const closedOwner = (
      entry: DataStructureEntry
    ): Option.Option<FunctionEntry> => {
      const roles = rolesFor(entry)

      if (HashSet.size(roles) > 0) {
        return Option.none()
      }

      const owners = ownersFor(entry)
      const candidates = functionOwners(entry)

      return Array.findFirst(candidates, (candidate) => {
        const callers = callersFor(candidate)
        const allowedOwners = pipe(callers, HashSet.add(candidate.symbol))
        const hasAtMostOneExternalOwner = HashSet.size(callers) <= 1
        const ownersStayInsideCluster = HashSet.every(owners, (owner) =>
          HashSet.has(allowedOwners, owner)
        )
        const clusterConditions = Array.make(
          hasAtMostOneExternalOwner,
          ownersStayInsideCluster
        )

        return Array.every(clusterConditions, Boolean)
      })
    }
    const duplicateTarget = (
      entry: DataStructureEntry
    ): Option.Option<DataStructureEntry> =>
      pipe(
        entry.shape,
        Option.flatMap((shape) => HashMap.get(index.shapeGroups, shape)),
        Option.filter((group) => group.length > 1),
        Option.map((group) => Array.sort(group, entryOrder)),
        Option.flatMap(Array.head),
        Option.filter((canonical) => canonical.symbol !== entry.symbol)
      )
    const ownerSourceFile = (
      symbol: ts.Symbol
    ): Option.Option<ts.SourceFile> => {
      const functionOwner = pipe(
        HashMap.get(index.functionBySymbol, symbol),
        Option.map(Struct.get("sourceFile"))
      )
      const dataOwner = pipe(
        HashMap.get(index.dataBySymbol, symbol),
        Option.map(Struct.get("sourceFile"))
      )
      const declarationOwner = pipe(
        symbol.declarations ?? Array.empty(),
        Array.head,
        Option.map((declaration) => declaration.getSourceFile())
      )

      return pipe(
        functionOwner,
        Option.orElse(Function.constant(dataOwner)),
        Option.orElse(Function.constant(declarationOwner))
      )
    }
    const jsDocText = (
      comment: ts.JSDoc["comment"] | ts.JSDocTag["comment"]
    ): string =>
      pipe(
        ts.getTextOfJSDocComment(comment),
        Option.fromNullable,
        Option.getOrElse(Function.constant(""))
      )
    const rationaleIsComplete = (entry: DataStructureEntry): boolean => {
      const commentsAndTags = ts.getJSDocCommentsAndTags(
        entry.documentationNode
      )
      const docs = Array.filter(commentsAndTags, ts.isJSDoc)
      const tags = Array.flatMap(docs, (doc) => doc.tags ?? Array.empty())
      const roleTags = Array.filter(
        tags,
        (tag) => tag.tagName.text === "modelRole"
      )
      const remarksTags = Array.filter(
        tags,
        (tag) => tag.tagName.text === "remarks"
      )
      const description = pipe(
        docs,
        Array.map((doc) => jsDocText(doc.comment)),
        Array.join(" "),
        (text) => text.trim()
      )
      const roleText = pipe(
        roleTags,
        Array.head,
        Option.map((tag) => jsDocText(tag.comment).trim())
      )
      const remarks = pipe(
        remarksTags,
        Array.map((tag) => jsDocText(tag.comment)),
        Array.join(" "),
        (text) => text.toLowerCase()
      )
      const role = pipe(
        roleText,
        Option.filter((value) =>
          HashSet.has(validModelRoles, value as ModelRole)
        ),
        Option.map((value) => value as ModelRole)
      )
      const established = pipe(
        role,
        Option.exists((claimed) => HashSet.has(rolesFor(entry), claimed))
      )
      const hasOneRole = roleTags.length === 1
      const hasDescription = description.length > 0
      const explainsCause = remarks.includes("because")
      const explainsDeletion = remarks.includes("remov")
      const conditions = Array.make(
        hasOneRole,
        hasDescription,
        explainsCause,
        explainsDeletion,
        established
      )

      return Array.every(conditions, Boolean)
    }

    const redundantPairs = Array.filterMap(entries, (entry) =>
      pipe(
        redundantTarget(entry),
        Option.map((target) => [entry, target] as const)
      )
    )
    const redundantSymbols = pipe(
      redundantPairs,
      Array.map(([entry]) => entry.symbol),
      HashSet.fromIterable
    )
    const closedPairs = Array.filterMap(entries, (entry) =>
      HashSet.has(redundantSymbols, entry.symbol)
        ? Option.none()
        : pipe(
            closedOwner(entry),
            Option.map((owner) => [entry, owner] as const)
          )
    )
    const closedSymbols = pipe(
      closedPairs,
      Array.map(([entry]) => entry.symbol),
      HashSet.fromIterable
    )
    const duplicatePairs = Array.filterMap(entries, (entry) => {
      const excluded = HashSet.has(closedSymbols, entry.symbol)
      const isRedundant = HashSet.has(redundantSymbols, entry.symbol)
      const exclusions = Array.make(excluded, isRedundant)

      return Array.some(exclusions, Boolean)
        ? Option.none()
        : pipe(
            duplicateTarget(entry),
            Option.map((target) => [entry, target] as const)
          )
    })
    const duplicateSymbols = pipe(
      duplicatePairs,
      Array.map(([entry]) => entry.symbol),
      HashSet.fromIterable
    )

    Array.forEach(closedPairs, ([entry, owner]) => {
      const callers = callersFor(owner)
      const data = signalData(
        "closed-abstraction",
        entry,
        owner.name,
        Array.of(owner.name),
        HashSet.size(callers)
      )

      append(
        entry.nameNode,
        `${entry.name} and ${owner.name} form a closed abstraction with at most one external owner.`,
        closedHint,
        data
      )
    })

    Array.forEach(redundantPairs, ([entry, target]) => {
      const data = signalData(
        "redundant-alias",
        entry,
        target.name,
        Array.of(target.name),
        0
      )

      append(
        entry.nameNode,
        `${entry.name} renames ${target.name} without adding independent semantics.`,
        `Use ${target.name} directly, merge the concepts, or add a real invariant or independently evolving boundary. Do not keep a second name only to describe structural use.`,
        data
      )
    })

    Array.forEach(duplicatePairs, ([entry, target]) => {
      const data = signalData(
        "duplicate-shape",
        entry,
        target.name,
        Array.of(target.name),
        0
      )

      append(
        entry.nameNode,
        `${entry.name} duplicates the concrete field structure of ${target.name}.`,
        duplicateHint,
        data
      )
    })

    const readFields = pipe(
      index.fieldReads,
      Array.map(Struct.get("field")),
      HashSet.fromIterable
    )

    Array.forEach(entries, (entry) => {
      const structurallyDecided = Array.some(
        Array.make(
          HashSet.has(closedSymbols, entry.symbol),
          HashSet.has(redundantSymbols, entry.symbol),
          HashSet.has(duplicateSymbols, entry.symbol)
        ),
        Boolean
      )

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
      const roleExempt = Array.some(
        Array.make(
          HashSet.has(roles, "boundary"),
          HashSet.has(roles, "protocol")
        ),
        Boolean
      )

      if (Option.isSome(matchingOwner) && !roleExempt) {
        const owner = matchingOwner.value
        const callers = callersFor(owner)
        const allowedOwners = pipe(callers, HashSet.add(owner.symbol))
        const ownersStayInsideCluster = HashSet.every(owners, (candidate) =>
          HashSet.has(allowedOwners, candidate)
        )

        if (ownersStayInsideCluster) {
          const data = signalData(
            "function-derived-model",
            entry,
            owner.name,
            Array.of(owner.name),
            HashSet.size(callers)
          )

          append(
            entry.nameNode,
            `${entry.name} is named after its sole function role instead of independent semantics.`,
            "Remove or deepen the function-data abstraction, or replace this structural-role name with an existing domain concept. A new name must mean more than input, output, options, context, state, or result for one function.",
            data
          )
          return
        }
      }

      const externalOwners = pipe(
        owners,
        Array.fromIterable,
        Array.filterMap(ownerSourceFile),
        Array.filter((sourceFile) => sourceFile !== entry.sourceFile)
      )
      const speculative =
        entry.exported && externalOwners.length === 0 && !roleExempt

      if (speculative) {
        const data = signalData(
          "speculative-export",
          entry,
          "",
          Array.empty(),
          0
        )

        append(
          entry.nameNode,
          `${entry.name} is exported without an independent first-party consumer or established boundary.`,
          "Remove the export and keep ownership local, or connect the model to an intentional public seam. Exporting a declaration does not establish reuse and must not evade abstraction analysis.",
          data
        )
        return
      }

      const reflectsExternally = Array.some(
        Array.make(
          HashSet.has(roles, "boundary"),
          HashSet.has(roles, "protocol")
        ),
        Boolean
      )
      const unusedFields = reflectsExternally
        ? Array.empty<ts.Symbol>()
        : Array.filter(entry.fieldSymbols, (field) => {
            const directlyRead = HashSet.has(readFields, field)
            const functionallyRead = HashSet.has(
              index.readFieldNames,
              field.getName()
            )
            const readChecks = Array.make(directlyRead, functionallyRead)

            return Array.every(readChecks, (read) => !read)
          })

      if (unusedFields.length > 0) {
        Array.forEach(unusedFields, (field) => {
          const declaration = pipe(
            field.declarations ?? Array.empty(),
            Array.head,
            Option.getOrElse(Function.constant(entry.nameNode))
          )
          const data = signalData(
            "unused-field",
            entry,
            "",
            Array.of(field.getName()),
            0
          )

          append(
            declaration,
            `${entry.name}.${field.getName()} is constructed but never independently read.`,
            "Delete the speculative field or connect it to behavior that consumes its semantics. Mechanical forwarding into another representation is not a read and instead indicates parallel concepts.",
            data
          )
        })
        return
      }

      if (!rationaleIsComplete(entry)) {
        const data = signalData(
          "missing-rationale",
          entry,
          "",
          Array.empty(),
          0
        )

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
      Array.filter((entry) =>
        Array.some(
          Array.make(
            HashSet.has(closedSymbols, entry.symbol),
            HashSet.has(redundantSymbols, entry.symbol),
            HashSet.has(duplicateSymbols, entry.symbol)
          ),
          Boolean
        )
      ),
      Array.map(Struct.get("symbol")),
      HashSet.fromIterable
    )

    pipe(
      index.parameterBags,
      Array.filter((bag) => bag.node.getSourceFile() === context.sourceFile),
      Array.filter((bag) => !HashSet.has(occupiedModels, bag.model.symbol)),
      Array.filter((bag) => {
        const roles = rolesFor(bag.model)
        const exemptions = Array.make(
          HashSet.has(roles, "boundary"),
          HashSet.has(roles, "invariant"),
          HashSet.has(roles, "protocol")
        )

        return Array.every(exemptions, (exempt) => !exempt)
      }),
      Array.forEach((bag) => {
        const data = signalData(
          "parameter-bag",
          bag.model,
          bag.functionEntry.name,
          Array.of(bag.functionEntry.name),
          HashSet.size(callersFor(bag.functionEntry))
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
      Array.filter(
        (conversion) => conversion.node.getSourceFile() === context.sourceFile
      ),
      Array.filter(
        (conversion) =>
          !HashSet.has(occupiedModels, conversion.source.symbol) &&
          !HashSet.has(occupiedModels, conversion.target.symbol)
      ),
      Array.forEach((conversion) => {
        const related = Array.make(
          conversion.source.name,
          conversion.target.name
        )
        const data = signalData(
          "pass-through-conversion",
          conversion.target,
          conversion.functionEntry.name,
          related,
          HashSet.size(callersFor(conversion.functionEntry))
        )

        append(
          conversion.node,
          `${conversion.functionEntry.name} copies ${conversion.source.name} into ${conversion.target.name} without transformation.`,
          "Collapse the parallel representations or document and preserve the real boundary that requires both. A field-for-field adapter is evidence against introducing another first-party concept.",
          data
        )
      })
    )

    return Array.fromIterable(found)
  }

  return fileSubscriptions(matches)
}

export const conceptControl: Check = withProgramIndex(buildConceptIndex)(
  conceptControlSubscriptions
)

export const conceptControlExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("concept-control")
