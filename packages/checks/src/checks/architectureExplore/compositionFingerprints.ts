import { Array, Function, Match, Option, pipe, Result } from "effect"
import * as ts from "typescript"
import { withProgramIndex } from "@better-typescript/core/engine/sources"
import { fileSubscriptions, detection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { CompositionFingerprintData } from "./data.js"
import {
  ExportReferenceIndex,
  buildExportReferenceIndex,
  isTestSourceFile
} from "./programSymbols.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"

const minimumSteps = 3

const emptyFingerprintNames: ReadonlyArray<string> = Array.empty()

const emptyFingerprintNamesFallback = Function.constant(emptyFingerprintNames)

const message =
  "Composition fingerprint evidence — this export orchestrates a repeatable call shape."

const hint =
  "Advice compares fingerprints across Modules because the same orchestration in two places is a missing operation."

const isNonOptionalPropertyAccess = (
  expression: ts.Expression
): expression is ts.PropertyAccessExpression =>
  pipe(
    expression,
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.exists((access) => pipe(access.questionDotToken, Option.fromNullishOr, Option.isNone))
  )

const calleeName = (expression: ts.Expression): Option.Option<string> =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Match.value,
    Match.when(ts.isIdentifier, (identifier) => Option.some(identifier.text)),
    Match.when(isNonOptionalPropertyAccess, (access) =>
      pipe(
        calleeName(access.expression),
        Option.map((left) => `${left}.${access.name.text}`)
      )
    ),
    Match.orElse(() => Option.none())
  )

const walkExpression = (expression: ts.Expression): ReadonlyArray<string> =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Match.value,
    Match.when(ts.isCallExpression, walkCallExpression),
    Match.when(ts.isArrowFunction, (arrow) => walkConciseBody(arrow.body)),
    Match.when(ts.isFunctionExpression, (functionExpression) => walkBlock(functionExpression.body)),
    Match.when(ts.isBinaryExpression, (binary) => {
      const leftNames = walkExpression(binary.left)
      const rightNames = walkExpression(binary.right)

      return Array.appendAll(leftNames, rightNames)
    }),
    Match.when(ts.isConditionalExpression, (conditional) => {
      const conditionNames = walkExpression(conditional.condition)
      const whenTrueNames = walkExpression(conditional.whenTrue)
      const whenFalseNames = walkExpression(conditional.whenFalse)

      return pipe(conditionNames, Array.appendAll(whenTrueNames), Array.appendAll(whenFalseNames))
    }),
    Match.when(ts.isPropertyAccessExpression, (access) => walkExpression(access.expression)),
    Match.when(ts.isElementAccessExpression, (access) => {
      const objectNames = walkExpression(access.expression)

      const argumentNames = pipe(
        Option.fromNullishOr(access.argumentExpression),
        Option.map(walkExpression),
        Option.getOrElse(emptyFingerprintNamesFallback)
      )

      return Array.appendAll(objectNames, argumentNames)
    }),
    Match.when(ts.isNewExpression, (newExpression) => {
      const expressionNames = pipe(
        Option.fromNullishOr(newExpression.expression),
        Option.map(walkExpression),
        Option.getOrElse(emptyFingerprintNamesFallback)
      )

      const argumentNames = pipe(
        Option.fromNullishOr(newExpression.arguments),
        Option.map((args) => Array.flatMap(args, walkExpression)),
        Option.getOrElse(emptyFingerprintNamesFallback)
      )

      return Array.appendAll(expressionNames, argumentNames)
    }),
    Match.when(ts.isArrayLiteralExpression, (arrayLiteral) =>
      Array.flatMap(arrayLiteral.elements, (element) =>
        pipe(
          Match.value(element),
          Match.when(ts.isSpreadElement, (spread) => walkExpression(spread.expression)),
          Match.when(ts.isExpression, walkExpression),
          Match.orElse(emptyFingerprintNamesFallback)
        )
      )
    ),
    Match.when(ts.isObjectLiteralExpression, (objectLiteral) =>
      Array.flatMap(objectLiteral.properties, walkObjectProperty)
    ),
    Match.when(ts.isTemplateExpression, (template) =>
      Array.flatMap(template.templateSpans, (span) => walkExpression(span.expression))
    ),
    Match.when(ts.isPrefixUnaryExpression, (prefix) => walkExpression(prefix.operand)),
    Match.when(ts.isPostfixUnaryExpression, (postfix) => walkExpression(postfix.operand)),
    Match.when(ts.isAwaitExpression, (awaitExpression) =>
      walkExpression(awaitExpression.expression)
    ),
    Match.when(ts.isTypeOfExpression, (typeOfExpression) =>
      walkExpression(typeOfExpression.expression)
    ),
    Match.orElse(emptyFingerprintNamesFallback)
  )

const walkObjectProperty = (property: ts.ObjectLiteralElementLike): ReadonlyArray<string> =>
  pipe(
    Match.value(property),
    Match.when(ts.isPropertyAssignment, (assignment) => walkExpression(assignment.initializer)),
    Match.when(ts.isShorthandPropertyAssignment, (shorthand) =>
      pipe(
        Option.fromNullishOr(shorthand.objectAssignmentInitializer),
        Option.map(walkExpression),
        Option.getOrElse(emptyFingerprintNamesFallback)
      )
    ),
    Match.when(ts.isSpreadAssignment, (spread) => walkExpression(spread.expression)),
    Match.when(ts.isMethodDeclaration, (method) =>
      pipe(
        Option.fromNullishOr(method.body),
        Option.map(walkBlock),
        Option.getOrElse(emptyFingerprintNamesFallback)
      )
    ),
    Match.orElse(emptyFingerprintNamesFallback)
  )

// Point-free pipe/flow stages are bare identifier or property-access chains only.
const pointFreeStageName = (argument: ts.Expression): Option.Option<string> =>
  pipe(
    argument,
    unwrapTransparentExpression,
    Option.some,
    Option.filter((candidate) => !ts.isCallExpression(candidate)),
    Option.flatMap(calleeName)
  )

// Preorder DFS over CallExpressions in source order. Every call contributes its callee
// text; bare pipe/flow additionally contribute point-free stage names (pipe skips arg0).
// Nested call arguments are covered by the DFS; other argument identities contribute nothing.
const walkCallExpression = (call: ts.CallExpression): ReadonlyArray<string> => {
  const callee = unwrapTransparentExpression(call.expression)
  const name = calleeName(callee)
  const calleeIdentifier = Option.liftPredicate(ts.isIdentifier)(callee)

  const barePipe = pipe(
    calleeIdentifier,
    Option.exists((identifier) => identifier.text === "pipe")
  )

  const bareFlow = pipe(
    calleeIdentifier,
    Option.exists((identifier) => identifier.text === "flow")
  )

  const head = Option.match(name, {
    onNone: () => walkExpression(callee),
    onSome: Array.of
  })

  const pointFreeCompositionChecks = Array.make(barePipe, bareFlow)
  const isPointFreeComposition = Array.some(pointFreeCompositionChecks, Boolean)
  const keepPointFreeComposition = Function.constant(isPointFreeComposition)

  const argumentNames = Array.flatMap(call.arguments, (argument, index) => {
    const skipDataSubjectChecks = Array.make(barePipe, index === 0)
    const skipDataSubject = Array.every(skipDataSubjectChecks, Boolean)

    return pipe(
      Option.some(argument),
      Option.filter(keepPointFreeComposition),
      Option.filter(() => !skipDataSubject),
      Option.flatMap(pointFreeStageName),
      Option.map(Array.of),
      Option.getOrElse(() => walkExpression(argument))
    )
  })

  return Array.appendAll(head, argumentNames)
}

const walkStatement = (statement: ts.Statement): ReadonlyArray<string> =>
  pipe(
    Match.value(statement),
    Match.when(ts.isExpressionStatement, (expressionStatement) =>
      walkExpression(expressionStatement.expression)
    ),
    Match.when(ts.isReturnStatement, (returnStatement) =>
      pipe(
        Option.fromNullishOr(returnStatement.expression),
        Option.map(walkExpression),
        Option.getOrElse(emptyFingerprintNamesFallback)
      )
    ),
    Match.when(ts.isVariableStatement, (variableStatement) =>
      Array.flatMap(variableStatement.declarationList.declarations, (declaration) =>
        pipe(
          Option.fromNullishOr(declaration.initializer),
          Option.map(walkExpression),
          Option.getOrElse(emptyFingerprintNamesFallback)
        )
      )
    ),
    Match.when(ts.isIfStatement, (ifStatement) => {
      const conditionNames = walkExpression(ifStatement.expression)
      const thenNames = walkStatement(ifStatement.thenStatement)

      const elseNames = pipe(
        Option.fromNullishOr(ifStatement.elseStatement),
        Option.map(walkStatement),
        Option.getOrElse(emptyFingerprintNamesFallback)
      )

      return pipe(conditionNames, Array.appendAll(thenNames), Array.appendAll(elseNames))
    }),
    Match.when(ts.isBlock, walkBlock),
    Match.when(ts.isThrowStatement, (throwStatement) =>
      pipe(
        Option.fromNullishOr(throwStatement.expression),
        Option.map(walkExpression),
        Option.getOrElse(emptyFingerprintNamesFallback)
      )
    ),
    Match.orElse(emptyFingerprintNamesFallback)
  )

const walkBlock = (block: ts.Block): ReadonlyArray<string> =>
  Array.flatMap(block.statements, walkStatement)

const walkConciseBody = (body: ts.ConciseBody): ReadonlyArray<string> =>
  pipe(Match.value(body), Match.when(ts.isBlock, walkBlock), Match.orElse(walkExpression))

const unwrapCurriedFunction = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
): ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration =>
  pipe(
    node,
    Option.liftPredicate(ts.isArrowFunction),
    Option.filter(
      (arrow): arrow is ts.ArrowFunction & { readonly body: ts.Expression } =>
        !ts.isBlock(arrow.body)
    ),
    Option.map((arrow) =>
      pipe(
        arrow.body,
        unwrapTransparentExpression,
        Match.value,
        Match.when(ts.isArrowFunction, unwrapCurriedFunction),
        Match.orElse(() => node)
      )
    ),
    Option.getOrElse(() => node)
  )

const fingerprintNames = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
): ReadonlyArray<string> =>
  pipe(Option.fromNullishOr(node.body), Option.map(walkConciseBody), Option.getOrElse(Array.empty))

const compositionFingerprintElements =
  (index: ExportReferenceIndex) =>
  (context: CheckContext): ReadonlyArray<Detection> => {
    if (isTestSourceFile(context.projectRoot)(context.sourceFile)) {
      return Array.empty()
    }

    const element = detection(context)

    return pipe(
      index.entries,
      Array.filter((entry) => entry.nameNode.getSourceFile() === context.sourceFile),
      Array.filterMap((entry) => {
        const root = unwrapCurriedFunction(entry.functionNode)
        const names = fingerprintNames(root)

        if (names.length < minimumSteps) {
          return Result.failVoid
        }

        const fingerprint = Array.join(names, ">")

        const data = new CompositionFingerprintData({
          fingerprint,
          stepCount: names.length,
          exportName: entry.nameNode.text
        })

        const reported = element({
          node: entry.nameNode,
          message,
          hint,
          data
        })

        return Result.succeed(reported)
      })
    )
  }

const compositionFingerprintSubscriptions = Function.compose(
  compositionFingerprintElements,
  fileSubscriptions
)

export const compositionFingerprints: Check = withProgramIndex(buildExportReferenceIndex)(
  compositionFingerprintSubscriptions
)
