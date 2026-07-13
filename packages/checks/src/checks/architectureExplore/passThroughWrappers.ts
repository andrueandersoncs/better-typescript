import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import {
  combineAll,
  nodeSubscriptions
} from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { PassThroughWrapperData } from "./data.js"
import {
  conciseArrowBody,
  functionInitializer,
  unwrapExpression
} from "../support/tsNode.js"

const reexportMessage =
  "This Module is a Pass-through Wrapper — it only re-exports another Module."

const reexportHint =
  "Collapse the re-export into the defining Module, or give this Module real depth " +
  "behind a smaller interface so the deletion test would concentrate complexity here."

const forwardingMessage =
  "This export is a Pass-through Wrapper — it only forwards a single call."

const forwardingHint =
  "Inline the forwarder at its call sites, or deepen the Module so the interface hides real behaviour."

const isExportKeyword = (modifier: ts.ModifierLike): boolean =>
  modifier.kind === ts.SyntaxKind.ExportKeyword

const implementationExpressionKinds = HashSet.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ClassExpression
)

const compositionNames = HashSet.make("pipe", "flow")

const isForwardingCall = (call: ts.CallExpression): boolean => {
  const hasImplementation = Array.some(call.arguments, (argument) => {
    const unwrapped = unwrapExpression(argument)

    return HashSet.has(implementationExpressionKinds, unwrapped.kind)
  })

  const unwrappedCallee = unwrapExpression(call.expression)

  const fromIdentifier = pipe(
    Option.liftPredicate(ts.isIdentifier)(unwrappedCallee),
    Option.map(Struct.get("text"))
  )

  const fromProperty = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(unwrappedCallee),
    Option.map((access) => pipe(access.name, Struct.get("text")))
  )

  const calleeName = pipe(
    fromIdentifier,
    Option.orElse(Function.constant(fromProperty))
  )

  const isComposition = pipe(
    calleeName,
    Option.map((name) => HashSet.has(compositionNames, name)),
    Option.getOrElse(Function.constant(false))
  )

  const hasMultipleStages = call.arguments.length > 2
  const multiStageChecks = Array.make(isComposition, hasMultipleStages)
  const isMultiStage = Array.every(multiStageChecks, Boolean)
  const opaqueChecks = Array.make(hasImplementation, isMultiStage)
  const isOpaque = Array.some(opaqueChecks, Boolean)

  return isOpaque === false
}

const isForwardingArrow = (arrow: ts.ArrowFunction): boolean => {
  const body = conciseArrowBody(arrow)
  const callBody = pipe(body, Option.filter(ts.isCallExpression))

  return Option.exists(callBody, isForwardingCall)
}

const passThroughExportDeclarationElements = (context: CheckContext) => {
  const element = detection(context)

  const handler = (node: ts.ExportDeclaration): ReadonlyArray<Detection> => {
    const hasModuleSpecifier = pipe(
      Option.fromNullable(node.moduleSpecifier),
      Option.isSome
    )

    const data = new PassThroughWrapperData({
      kind: "reexport",
      exportCount: 1
    })

    const reported = element({
      node,
      message: reexportMessage,
      hint: reexportHint,
      data
    })

    return hasModuleSpecifier ? Array.of(reported) : Array.empty()
  }

  return handler
}

const variableStatementElements = (context: CheckContext) => {
  const element = detection(context)

  const toDetection = (
    declaration: ts.VariableDeclaration
  ): Option.Option<Detection> => {
    const isForwarding = pipe(
      functionInitializer(declaration),
      Option.filter(ts.isArrowFunction),
      Option.map(isForwardingArrow),
      Option.getOrElse(Function.constant(false))
    )

    const nameNode = pipe(
      Option.fromNullable(declaration.name),
      Option.filter(ts.isIdentifier),
      Option.getOrElse(Function.constant(declaration))
    )

    const data = new PassThroughWrapperData({
      kind: "forwarding-call",
      exportCount: 1
    })

    const reported = element({
      node: nameNode,
      message: forwardingMessage,
      hint: forwardingHint,
      data
    })

    return isForwarding ? Option.some(reported) : Option.none()
  }

  const handler = (node: ts.VariableStatement): ReadonlyArray<Detection> => {
    const isExported = pipe(
      Option.fromNullable(node.modifiers),
      Option.map((modifiers) => Array.some(modifiers, isExportKeyword)),
      Option.getOrElse(Function.constant(false))
    )

    if (!isExported) {
      return Array.empty()
    }

    const declarations = Array.fromIterable(node.declarationList.declarations)

    return Array.filterMap(declarations, toDetection)
  }

  return handler
}

const exportDeclarationKinds = Array.of(ts.SyntaxKind.ExportDeclaration)

const exportDeclarationListeners = nodeSubscriptions(exportDeclarationKinds)(
  ts.isExportDeclaration
)(passThroughExportDeclarationElements)

const variableStatementKinds = Array.of(ts.SyntaxKind.VariableStatement)

const variableStatementListeners = nodeSubscriptions(variableStatementKinds)(
  ts.isVariableStatement
)(variableStatementElements)

const listeners = Array.make(
  exportDeclarationListeners,
  variableStatementListeners
)

export const passThroughWrappers: Check = combineAll(listeners)

export const passThroughWrappersExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("pass-through-wrappers")
