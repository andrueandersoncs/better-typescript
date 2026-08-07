import { Array, Function, Option, Predicate, Schema, Struct, Tuple, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { toRelativeFileName } from "../support/paths.js"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { ModuleEdge } from "./architectureExplore/moduleEdge.js"
import type { ExportReferenceIndex } from "./architectureExplore/exportReferenceIndex.js"
import type { ExportedFunctionEntry } from "./architectureExplore/exportedFunctionEntry.js"
import { usageFor } from "./architectureExplore/usageFor.js"
import { architectureEvidence } from "./architectureExplore/architectureEvidence.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { Match } from "../matcher/match.js"
import type { MatchContext } from "../matcher/matchContext.js"

import { stringArray } from "./architectureExplore/stringArraySchema.js"
import { isExactForwarder } from "./isExactForwarder.js"
import { evidenceFileMatcher } from "./evidenceFileMatcher.js"

const passThroughKinds = Array.make<["reexport", "forwarding-call"]>("reexport", "forwarding-call")
const passThroughKind = Schema.Literals(passThroughKinds)

// PassThroughWrapperData is wrapper evidence because advice correlates usage.
export const PassThroughWrapperData = Schema.Struct({
  kind: passThroughKind,
  exportCount: Schema.Number,
  callerCount: Schema.Number,
  callerPaths: stringArray,
  hasNonCallReference: Schema.Boolean
})

export interface PassThroughWrapperData extends Schema.Schema.Type<typeof PassThroughWrapperData> {}

const isPublicStatement = Predicate.not(ts.isImportDeclaration)

const hasModuleSpecifier = Function.flow(
  Struct.get<ts.ExportDeclaration, "moduleSpecifier">("moduleSpecifier"),
  Option.fromNullishOr,
  Option.isSome
)

const reexportOnlyStatements = (sourceFile: ts.SourceFile): ReadonlyArray<ts.ExportDeclaration> => {
  const publicStatements = Array.filter(sourceFile.statements, isPublicStatement)
  const reexports = Array.filter(publicStatements, ts.isExportDeclaration)
  const allReexports = Array.every(reexports, hasModuleSpecifier)
  const onlyReexports = strictEqual(publicStatements.length)(reexports.length)

  return allReexports && onlyReexports ? reexports : Array.empty()
}

const passThroughElements =
  (index: readonly [ExportReferenceIndex, ReadonlyArray<ModuleEdge>, string]) =>
  (context: MatchContext): ReadonlyArray<Match<PassThroughWrapperData>> => {
    const [references, edges, projectRoot] = index
    const relative = toRelativeFileName(projectRoot)
    const filePath = relative(context.sourceFile.fileName)

    const entryIsExactForwarder = (entry: ExportedFunctionEntry) =>
      isExactForwarder(entry.functionNode)

    const detectionForEntry = (entry: (typeof references.entries)[number]) => {
      const usage = usageFor(references)(entry)

      const data = PassThroughWrapperData.make({
        kind: "forwarding-call",
        exportCount: 1,
        callerCount: usage.productionCallCount,
        callerPaths: usage.productionPaths,
        hasNonCallReference: usage.hasProductionNonCallReference
      })

      return makeNodeMatch(entry.nameNode, data)
    }

    const isEntryInSourceFile = flow(
      Struct.get<(typeof references.entries)[number], "nameNode">("nameNode"),
      (nameNode) => nameNode.getSourceFile(),
      strictEqual(context.sourceFile)
    )

    const forwarding = pipe(
      references.entries,
      Array.filter(isEntryInSourceFile),
      Array.filter(entryIsExactForwarder),
      Array.map(detectionForEntry)
    )

    const reexports = reexportOnlyStatements(context.sourceFile)

    const importsFilePath = flow(
      Struct.get<(typeof edges)[number], "importedPath">("importedPath"),
      strictEqual(filePath)
    )

    const inboundPaths = pipe(
      edges,
      Array.filter(importsFilePath),
      Array.filter((edge) => !edge.fromTest),
      Array.map(Struct.get("importerPath")),
      Array.dedupe
    )

    const reexportDetection = pipe(
      Array.head(reexports),
      Option.map((node) => {
        const data = PassThroughWrapperData.make({
          kind: "reexport",
          exportCount: reexports.length,
          callerCount: inboundPaths.length,
          callerPaths: inboundPaths,
          hasNonCallReference: false
        })

        return makeNodeMatch(node, data)
      }),
      Option.toArray
    )

    return Array.appendAll(forwarding, reexportDetection)
  }

const buildIndex = (
  context: ProgramContext
): readonly [ExportReferenceIndex, ReadonlyArray<ModuleEdge>, string] => {
  const references = architectureEvidence(context).exportReferenceIndex
  const edges = architectureEvidence(context).moduleEdges

  return Tuple.make(references, edges, context.projectRoot)
}

export const passThroughWrappers = evidenceFileMatcher(buildIndex)(passThroughElements)
