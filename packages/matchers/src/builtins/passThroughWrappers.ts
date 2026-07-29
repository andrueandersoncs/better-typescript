import { Array, Function, Option, Predicate, Struct, Tuple, pipe, Result, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { toRelativeFileName } from "../support/paths.js"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { PassThroughWrapperData } from "./architectureExploreData.js"
import { ModuleEdge } from "./architectureExplore/moduleEdges.js"
import {
  ExportReferenceIndex,
  type ExportedFunctionEntry,
  usageFor
} from "./architectureExplore/programSymbols.js"
import {
  evidenceMatcher,
  exportReferenceIndex,
  moduleEdges
} from "./architectureExplore/architectureEvidence.js"
import { type CallLikeExpression, isExpressionBody, unwrapExpression } from "../support/tsNode.js"
import { fileSubscriptions } from "@better-typescript/matchers/matcher"
import {
  makeNodeMatch,
  type Match,
  type MatchContext
} from "@better-typescript/matchers/matcher/data"

const isForwardingInvocation = (expression: ts.Expression): expression is CallLikeExpression =>
  ts.isCallExpression(expression) || ts.isNewExpression(expression)

const headStatement = (block: ts.Block) => Array.head(block.statements)

const returnInvocationExpression = Function.flow(
  Struct.get<ts.ReturnStatement, "expression">("expression"),
  Option.fromNullishOr,
  Option.map(unwrapExpression),
  Option.filter(isForwardingInvocation)
)

const isPublicStatement = Predicate.not(ts.isImportDeclaration)

export const invocationExpressionBody = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
) =>
  pipe(
    Option.fromNullishOr(node.body),
    Option.flatMap((body) => {
      const expressionInvocation = pipe(
        Option.liftPredicate(isExpressionBody)(body),
        Option.map(unwrapExpression),
        Option.filter(isForwardingInvocation)
      )

      const blockInvocation = pipe(
        Option.liftPredicate(ts.isBlock)(body),
        Option.flatMap(headStatement),
        Option.filter(ts.isReturnStatement),
        Option.flatMap(returnInvocationExpression)
      )

      return pipe(expressionInvocation, Option.orElse(Function.constant(blockInvocation)))
    })
  )

const parameterIdentifiers = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
): Option.Option<ReadonlyArray<ts.Identifier>> => {
  const identifiers = Array.filterMap(node.parameters, (parameter) => {
    const initializer = Option.fromNullishOr(parameter.initializer)
    const restToken = Option.fromNullishOr(parameter.dotDotDotToken)
    const initializerMissing = Option.isNone(initializer)
    const restTokenMissing = Option.isNone(restToken)
    const omissions = Array.make(initializerMissing, restTokenMissing)
    const unmodified = Array.every(omissions, Boolean)
    const identifier = pipe(Option.some(parameter.name), Option.filter(ts.isIdentifier))

    return pipe(
      identifier,
      Option.filter(Function.constant(unmodified)),
      Result.fromOption(Function.constVoid)
    )
  })

  return strictEqual(node.parameters.length)(identifiers.length)
    ? Option.some(identifiers)
    : Option.none()
}

const propertyForwardingName = (property: ts.ObjectLiteralElementLike) => {
  const shorthandName = pipe(
    Option.liftPredicate(ts.isShorthandPropertyAssignment)(property),
    Option.map(Struct.get("name")),
    Option.map(Struct.get("text"))
  )

  const assignmentName = pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(property),
    Option.map(Struct.get("initializer")),
    Option.map(unwrapExpression),
    Option.filter(ts.isIdentifier),
    Option.map(Struct.get("text"))
  )

  return pipe(
    shorthandName,
    Option.orElse(Function.constant(assignmentName)),
    Result.fromOption(Function.constVoid)
  )
}

const forwardedArgumentNames = (
  argument: ts.Expression
): Result.Result<ReadonlyArray<string>, void> => {
  const expression = unwrapExpression(argument)

  const identifierNames = pipe(
    Option.liftPredicate(ts.isIdentifier)(expression),
    Option.map(Struct.get("text")),
    Option.map(Array.of)
  )

  const objectNames = pipe(
    Option.liftPredicate(ts.isObjectLiteralExpression)(expression),
    Option.flatMap((objectLiteral) => {
      const names = Array.filterMap(objectLiteral.properties, propertyForwardingName)
      const everyPropertyForwards = strictEqual(objectLiteral.properties.length)(names.length)

      return everyPropertyForwards ? Option.some(names) : Option.none()
    })
  )

  return pipe(
    identifierNames,
    Option.orElse(Function.constant(objectNames)),
    Result.fromOption(Function.constVoid)
  )
}

const invocationArgumentNames = (
  invocation: CallLikeExpression
): Option.Option<ReadonlyArray<string>> => {
  const argumentsList = invocation.arguments ?? Array.empty<ts.Expression>()
  const namesByArgument = Array.filterMap(argumentsList, forwardedArgumentNames)
  const everyArgumentForwards = strictEqual(argumentsList.length)(namesByArgument.length)
  const names = Array.flatten(namesByArgument)

  return everyArgumentForwards ? Option.some(names) : Option.none()
}

const forwardingRootIdentifier = (expression: ts.Expression): Option.Option<ts.Identifier> => {
  const unwrapped = unwrapExpression(expression)
  const identifier = Option.liftPredicate(ts.isIdentifier)(unwrapped)

  const propertyRoot = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
    Option.map(Struct.get("expression")),
    Option.flatMap(forwardingRootIdentifier)
  )

  const elementRoot = pipe(
    Option.liftPredicate(ts.isElementAccessExpression)(unwrapped),
    Option.map(Struct.get("expression")),
    Option.flatMap(forwardingRootIdentifier)
  )

  return pipe(
    identifier,
    Option.orElse(Function.constant(propertyRoot)),
    Option.orElse(Function.constant(elementRoot))
  )
}

const consumedParameterNames = (
  invocation: CallLikeExpression,
  parameters: ReadonlyArray<ts.Identifier>
): Option.Option<ReadonlyArray<string>> => {
  const parameterNames = Array.map(parameters, Struct.get("text"))
  const isParameterName = (name: string) => Array.contains(parameterNames, name)
  const argumentNames = invocationArgumentNames(invocation)

  const receiverName = pipe(
    forwardingRootIdentifier(invocation.expression),
    Option.map(Struct.get("text")),
    Option.filter(isParameterName),
    Option.toArray
  )

  const appendReceiverName = (names: ReadonlyArray<string>) => Array.appendAll(receiverName, names)

  return pipe(argumentNames, Option.map(appendReceiverName))
}

export const isExactForwarder = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
) => {
  const consumedByParameters = (parameters: ReadonlyArray<ts.Identifier>) => {
    const namesConsumedBy = (invocation: CallLikeExpression) =>
      consumedParameterNames(invocation, parameters)

    const matchesForwardingShape = (consumedNames: ReadonlyArray<string>) => {
      const parameterNames = Array.map(parameters, Struct.get("text"))

      return Array.match(consumedNames, {
        onEmpty: () => strictEqual(0)(parameterNames.length),
        onNonEmpty: () => {
          const sameOrder = Array.every(parameterNames, (name, index) => {
            const candidate = Array.get(consumedNames, index)

            return Option.contains(candidate, name)
          })

          const sameLength = strictEqual(parameterNames.length)(consumedNames.length)

          return sameOrder && sameLength
        }
      })
    }

    return pipe(
      invocationExpressionBody(node),
      Option.flatMap(namesConsumedBy),
      Option.map(matchesForwardingShape)
    )
  }

  return pipe(
    parameterIdentifiers(node),
    Option.flatMap(consumedByParameters),
    Option.getOrElse(Function.constant(false))
  )
}

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
    const sourceFile = context.sourceFile
    const [references, edges, projectRoot] = index
    const relative = toRelativeFileName(projectRoot)
    const filePath = relative(sourceFile.fileName)

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
      strictEqual(sourceFile)
    )

    const forwarding = pipe(
      references.entries,
      Array.filter(isEntryInSourceFile),
      Array.filter(entryIsExactForwarder),
      Array.map(detectionForEntry)
    )

    const reexports = reexportOnlyStatements(sourceFile)

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
  const references = exportReferenceIndex(context)
  const edges = moduleEdges(context)

  return Tuple.make(references, edges, context.projectRoot)
}

const passThroughSubscriptions = Function.compose(passThroughElements, fileSubscriptions)

export const passThroughWrappers = evidenceMatcher(buildIndex)(passThroughSubscriptions)
