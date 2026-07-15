import { Array, Function, Option, Struct, Tuple, pipe } from "effect"
import * as ts from "typescript"
import { withProgramIndex } from "@better-typescript/core/engine/sources"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { fileSubscriptions, detection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"

import { PassThroughWrapperData } from "./data.js"
import {
  ExportReferenceIndex,
  ModuleEdge,
  buildExportReferenceIndex,
  buildModuleEdges,
  usageFor
} from "./programSymbols.js"
import { unwrapExpression } from "../support/tsNode.js"

const reexportMessage =
  "Pass-through Module evidence — this public file only re-exports other Modules."

const reexportHint =
  "Use caller count in Architecture Explore Advice to apply the deletion test; a public entry Module with multiple callers may be earning its keep as the seam."

const forwardingMessage =
  "Pass-through export evidence — this operation forwards every parameter unchanged into one call."

const forwardingHint =
  "Use caller count in Architecture Explore Advice: delete low-leverage indirection, but keep operations whose behaviour or naming would otherwise reappear across callers."

const isExpressionBody = (body: ts.ConciseBody): body is ts.Expression => !ts.isBlock(body)

const callExpressionBody = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
): Option.Option<ts.CallExpression> =>
  pipe(
    Option.fromNullable(node.body),
    Option.flatMap((body) => {
      const expressionCall = pipe(
        Option.liftPredicate(isExpressionBody)(body),
        Option.map(unwrapExpression),
        Option.filter(ts.isCallExpression)
      )

      const blockCall = pipe(
        Option.liftPredicate(ts.isBlock)(body),
        Option.flatMap((block) => Array.head(block.statements)),
        Option.filter(ts.isReturnStatement),
        Option.flatMap((statement) =>
          pipe(
            Option.fromNullable(statement.expression),
            Option.map(unwrapExpression),
            Option.filter(ts.isCallExpression)
          )
        )
      )

      return pipe(expressionCall, Option.orElse(Function.constant(blockCall)))
    })
  )

const parameterIdentifiers = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
): Option.Option<ReadonlyArray<ts.Identifier>> => {
  const identifiers = Array.filterMap(node.parameters, (parameter) => {
    const initializer = Option.fromNullable(parameter.initializer)
    const restToken = Option.fromNullable(parameter.dotDotDotToken)
    const initializerMissing = Option.isNone(initializer)
    const restTokenMissing = Option.isNone(restToken)
    const omissions = Array.make(initializerMissing, restTokenMissing)
    const unmodified = Array.every(omissions, Boolean)

    const identifier = pipe(Option.some(parameter.name), Option.filter(ts.isIdentifier))

    return pipe(identifier, Option.filter(Function.constant(unmodified)))
  })

  return identifiers.length === node.parameters.length ? Option.some(identifiers) : Option.none()
}

const forwardingRootIdentifier = (expression: ts.Expression): Option.Option<ts.Identifier> => {
  const unwrapped = unwrapExpression(expression)
  const identifier = Option.liftPredicate(ts.isIdentifier)(unwrapped)

  const propertyRoot = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
    Option.flatMap((access) => forwardingRootIdentifier(access.expression))
  )

  const elementRoot = pipe(
    Option.liftPredicate(ts.isElementAccessExpression)(unwrapped),
    Option.flatMap((access) => forwardingRootIdentifier(access.expression))
  )

  return pipe(
    identifier,
    Option.orElse(Function.constant(propertyRoot)),
    Option.orElse(Function.constant(elementRoot))
  )
}

const consumedParameterNames = (
  call: ts.CallExpression,
  parameters: ReadonlyArray<ts.Identifier>
): Option.Option<ReadonlyArray<string>> => {
  const parameterNames = Array.map(parameters, Struct.get("text"))

  const argumentNames = Array.filterMap(call.arguments, (argument) =>
    pipe(
      argument,
      unwrapExpression,
      Option.liftPredicate(ts.isIdentifier),
      Option.map(Struct.get("text"))
    )
  )

  if (argumentNames.length !== call.arguments.length) {
    return Option.none()
  }

  const receiverName = pipe(
    forwardingRootIdentifier(call.expression),
    Option.map(Struct.get("text")),
    Option.filter((name) => Array.contains(parameterNames, name)),
    Option.toArray
  )

  const consumedNames = Array.appendAll(receiverName, argumentNames)

  return Option.some(consumedNames)
}

const isExactForwarder = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
): boolean =>
  pipe(
    parameterIdentifiers(node),
    Option.flatMap((parameters) =>
      pipe(
        callExpressionBody(node),
        Option.flatMap((call) => consumedParameterNames(call, parameters)),
        Option.map((consumedNames) => {
          const parameterNames = Array.map(parameters, Struct.get("text"))

          return Array.match(consumedNames, {
            onEmpty: () => parameterNames.length === 0,
            onNonEmpty: () => {
              const sameOrder = Array.every(
                parameterNames,
                (name, index) => consumedNames[index] === name
              )

              const sameLength = consumedNames.length === parameterNames.length

              return sameOrder && sameLength
            }
          })
        })
      )
    ),
    Option.getOrElse(Function.constant(false))
  )

const hasModuleSpecifier = Function.flow(
  Struct.get("moduleSpecifier"),
  Option.fromNullable,
  Option.isSome
)

const reexportOnlyStatements = (sourceFile: ts.SourceFile): ReadonlyArray<ts.ExportDeclaration> => {
  const publicStatements = Array.filter(
    sourceFile.statements,
    (statement) => !ts.isImportDeclaration(statement)
  )

  const reexports = Array.filter(publicStatements, ts.isExportDeclaration)

  const allReexports = Array.every(reexports, hasModuleSpecifier)

  const onlyReexports = reexports.length === publicStatements.length

  return allReexports && onlyReexports ? reexports : Array.empty()
}

const passThroughElements =
  (index: readonly [ExportReferenceIndex, ReadonlyArray<ModuleEdge>, string]) =>
  (context: CheckContext): ReadonlyArray<Detection> => {
    const element = detection(context)
    const sourceFile = context.sourceFile
    const [references, edges, projectRoot] = index
    const relative = toRelativeFileName(projectRoot)
    const filePath = relative(sourceFile.fileName)

    const forwarding = pipe(
      references.entries,
      Array.filter((entry) => entry.nameNode.getSourceFile() === sourceFile),
      Array.filter((entry) => isExactForwarder(entry.functionNode)),
      Array.map((entry) => {
        const usage = usageFor(references)(entry)

        const data = new PassThroughWrapperData({
          kind: "forwarding-call",
          exportCount: 1,
          callerCount: usage.productionCallCount,
          callerPaths: usage.productionPaths,
          hasNonCallReference: usage.hasProductionNonCallReference
        })

        return element({
          node: entry.nameNode,
          message: forwardingMessage,
          hint: forwardingHint,
          data
        })
      })
    )

    const reexports = reexportOnlyStatements(sourceFile)

    const inboundPaths = pipe(
      edges,
      Array.filter((edge) => edge.importedPath === filePath),
      Array.filter((edge) => !edge.fromTest),
      Array.map(Struct.get("importerPath")),
      Array.dedupe
    )

    const reexportDetection = pipe(
      Option.fromNullable(reexports[0]),
      Option.map((node) => {
        const data = new PassThroughWrapperData({
          kind: "reexport",
          exportCount: reexports.length,
          callerCount: inboundPaths.length,
          callerPaths: inboundPaths,
          hasNonCallReference: false
        })

        return element({
          node,
          message: reexportMessage,
          hint: reexportHint,
          data
        })
      }),
      Option.toArray
    )

    return Array.appendAll(forwarding, reexportDetection)
  }

const buildIndex = (
  context: ProgramContext
): readonly [ExportReferenceIndex, ReadonlyArray<ModuleEdge>, string] => {
  const references = buildExportReferenceIndex(context)
  const edges = buildModuleEdges(context)

  return Tuple.make(references, edges, context.projectRoot)
}

const passThroughSubscriptions = Function.compose(passThroughElements, fileSubscriptions)

export const passThroughWrappers: Check = withProgramIndex(buildIndex)(passThroughSubscriptions)
