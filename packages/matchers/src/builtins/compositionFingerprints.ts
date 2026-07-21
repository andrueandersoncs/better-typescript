import { Array, Function, Match, Option, pipe, Result, Struct, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { CompositionFingerprintData } from "./architectureExploreData.js"
import { isTestSourceFile } from "./architectureExplore/paths.js"
import { ExportReferenceIndex } from "./architectureExplore/programSymbols.js"
import {
  evidenceMatcher,
  exportReferenceIndex
} from "./architectureExplore/architectureEvidence.js"
import { conciseArrowBody, unwrapTransparentExpression } from "../support/tsNode.js"
import { fileSubscriptions } from "@better-typescript/matchers/matcher"
import {
  makeNodeMatch,
  type Match as MatcherMatch,
  type MatchContext
} from "@better-typescript/matchers/matcher/data"

const minimumSteps = 3

const emptyFingerprintNames: ReadonlyArray<string> = Array.empty()

const emptyFingerprintNamesFallback = Function.constant(emptyFingerprintNames)

const isAbsentQuestionDotToken = (access: ts.PropertyAccessExpression) =>
  pipe(access.questionDotToken, Option.fromNullishOr, Option.isNone)

const isNonOptionalPropertyAccess = (
  expression: ts.Expression
): expression is ts.PropertyAccessExpression =>
  pipe(
    expression,
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.exists(isAbsentQuestionDotToken)
  )

const identifierText = (identifier: ts.Identifier) => Option.some(identifier.text)

const joinCalleeWithAccessName = (access: ts.PropertyAccessExpression) => (left: string) =>
  `${left}.${access.name.text}`

const propertyAccessCalleeName = (access: ts.PropertyAccessExpression) =>
  pipe(calleeName(access.expression), Option.map(joinCalleeWithAccessName(access)))

const calleeName = (expression: ts.Expression): Option.Option<string> =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Match.value,
    Match.when(ts.isIdentifier, identifierText),
    Match.when(isNonOptionalPropertyAccess, propertyAccessCalleeName),
    Match.orElse((): Option.Option<string> => Option.none())
  )

const walkArrowBody = (arrow: ts.ArrowFunction) => walkConciseBody(arrow.body)

const walkFunctionExpressionBody = (functionExpression: ts.FunctionExpression) =>
  walkBlock(functionExpression.body)

const walkPropertyAccessExpression = (access: ts.PropertyAccessExpression) =>
  walkExpression(access.expression)

const walkSpreadExpression = (spread: ts.SpreadElement | ts.SpreadAssignment) =>
  walkExpression(spread.expression)

const walkArrayElement = (element: ts.Expression | ts.SpreadElement): ReadonlyArray<string> =>
  pipe(
    Match.value(element),
    Match.when(ts.isSpreadElement, walkSpreadExpression),
    Match.when(ts.isExpression, walkExpression),
    Match.orElse(emptyFingerprintNamesFallback)
  )

const walkArrayLiteralElements = (arrayLiteral: ts.ArrayLiteralExpression) =>
  Array.flatMap(arrayLiteral.elements, walkArrayElement)

const walkObjectLiteralProperties = (objectLiteral: ts.ObjectLiteralExpression) =>
  Array.flatMap(objectLiteral.properties, walkObjectProperty)

const walkTemplateSpanExpression = (span: ts.TemplateSpan) => walkExpression(span.expression)

const walkTemplateSpans = (template: ts.TemplateExpression) =>
  Array.flatMap(template.templateSpans, walkTemplateSpanExpression)

const walkPrefixOperand = (prefix: ts.PrefixUnaryExpression) => walkExpression(prefix.operand)

const walkPostfixOperand = (postfix: ts.PostfixUnaryExpression) => walkExpression(postfix.operand)

const walkAwaitOperand = (awaitExpression: ts.AwaitExpression) =>
  walkExpression(awaitExpression.expression)

const walkTypeOfOperand = (typeOfExpression: ts.TypeOfExpression) =>
  walkExpression(typeOfExpression.expression)

const flatMapWalkExpressions = (args: ReadonlyArray<ts.Expression>) =>
  Array.flatMap(args, walkExpression)

const walkExpression = (expression: ts.Expression): ReadonlyArray<string> =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Match.value,
    Match.when(ts.isCallExpression, walkCallExpression),
    Match.when(ts.isArrowFunction, walkArrowBody),
    Match.when(ts.isFunctionExpression, walkFunctionExpressionBody),
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
    Match.when(ts.isPropertyAccessExpression, walkPropertyAccessExpression),
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
        Option.map(flatMapWalkExpressions),
        Option.getOrElse(emptyFingerprintNamesFallback)
      )

      return Array.appendAll(expressionNames, argumentNames)
    }),
    Match.when(ts.isArrayLiteralExpression, walkArrayLiteralElements),
    Match.when(ts.isObjectLiteralExpression, walkObjectLiteralProperties),
    Match.when(ts.isTemplateExpression, walkTemplateSpans),
    Match.when(ts.isPrefixUnaryExpression, walkPrefixOperand),
    Match.when(ts.isPostfixUnaryExpression, walkPostfixOperand),
    Match.when(ts.isAwaitExpression, walkAwaitOperand),
    Match.when(ts.isTypeOfExpression, walkTypeOfOperand),
    Match.orElse(emptyFingerprintNamesFallback)
  )

const walkPropertyAssignment = (assignment: ts.PropertyAssignment) =>
  walkExpression(assignment.initializer)

const walkShorthandPropertyAssignment = (shorthand: ts.ShorthandPropertyAssignment) =>
  pipe(
    Option.fromNullishOr(shorthand.objectAssignmentInitializer),
    Option.map(walkExpression),
    Option.getOrElse(emptyFingerprintNamesFallback)
  )

const walkMethodDeclarationBody = (method: ts.MethodDeclaration) =>
  pipe(
    Option.fromNullishOr(method.body),
    Option.map(walkBlock),
    Option.getOrElse(emptyFingerprintNamesFallback)
  )

const walkObjectProperty = (property: ts.ObjectLiteralElementLike): ReadonlyArray<string> =>
  pipe(
    Match.value(property),
    Match.when(ts.isPropertyAssignment, walkPropertyAssignment),
    Match.when(ts.isShorthandPropertyAssignment, walkShorthandPropertyAssignment),
    Match.when(ts.isSpreadAssignment, walkSpreadExpression),
    Match.when(ts.isMethodDeclaration, walkMethodDeclarationBody),
    Match.orElse(emptyFingerprintNamesFallback)
  )

// Point-free stages are bare identifier or property chains because calls fingerprint themselves.
const isNotCallExpression = (candidate: ts.Expression) => !ts.isCallExpression(candidate)

const pointFreeStageName = (argument: ts.Expression) =>
  pipe(
    argument,
    unwrapTransparentExpression,
    Option.some,
    Option.filter(isNotCallExpression),
    Option.flatMap(calleeName)
  )

const isPipeIdentifier = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("pipe"))

const isFlowIdentifier = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("flow"))

// Preorder DFS collects callee and point-free stage names because fingerprints mirror source order.
const walkCallExpression = (call: ts.CallExpression): ReadonlyArray<string> => {
  const callee = unwrapTransparentExpression(call.expression)
  const name = calleeName(callee)
  const calleeIdentifier = Option.liftPredicate(ts.isIdentifier)(callee)
  const barePipe = pipe(calleeIdentifier, Option.exists(isPipeIdentifier))
  const bareFlow = pipe(calleeIdentifier, Option.exists(isFlowIdentifier))
  const walkCallee = () => walkExpression(callee)

  const head = Option.match(name, {
    onNone: walkCallee,
    onSome: Array.of
  })

  const pointFreeCompositionChecks = Array.make(barePipe, bareFlow)
  const isPointFreeComposition = Array.some(pointFreeCompositionChecks, Boolean)
  const keepPointFreeComposition = Function.constant(isPointFreeComposition)

  const argumentNames = Array.flatMap(call.arguments, (argument, index) => {
    const isFirstArgument = strictEqual(0)(index)
    const skipDataSubjectChecks = Array.make(barePipe, isFirstArgument)
    const skipDataSubject = Array.every(skipDataSubjectChecks, Boolean)
    const keepNonDataSubject = () => !skipDataSubject
    const walkArgument = () => walkExpression(argument)

    return pipe(
      Option.some(argument),
      Option.filter(keepPointFreeComposition),
      Option.filter(keepNonDataSubject),
      Option.flatMap(pointFreeStageName),
      Option.map(Array.of),
      Option.getOrElse(walkArgument)
    )
  })

  return Array.appendAll(head, argumentNames)
}

const walkExpressionStatement = (expressionStatement: ts.ExpressionStatement) =>
  walkExpression(expressionStatement.expression)

const walkReturnStatementExpression = (returnStatement: ts.ReturnStatement) =>
  pipe(
    Option.fromNullishOr(returnStatement.expression),
    Option.map(walkExpression),
    Option.getOrElse(emptyFingerprintNamesFallback)
  )

const walkVariableDeclarationInitializer = (declaration: ts.VariableDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.initializer),
    Option.map(walkExpression),
    Option.getOrElse(emptyFingerprintNamesFallback)
  )

const walkVariableStatementDeclarations = (variableStatement: ts.VariableStatement) =>
  Array.flatMap(variableStatement.declarationList.declarations, walkVariableDeclarationInitializer)

const walkThrowStatementExpression = (throwStatement: ts.ThrowStatement) =>
  pipe(
    Option.fromNullishOr(throwStatement.expression),
    Option.map(walkExpression),
    Option.getOrElse(emptyFingerprintNamesFallback)
  )

const walkStatement = (statement: ts.Statement): ReadonlyArray<string> =>
  pipe(
    Match.value(statement),
    Match.when(ts.isExpressionStatement, walkExpressionStatement),
    Match.when(ts.isReturnStatement, walkReturnStatementExpression),
    Match.when(ts.isVariableStatement, walkVariableStatementDeclarations),
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
    Match.when(ts.isThrowStatement, walkThrowStatementExpression),
    Match.orElse(emptyFingerprintNamesFallback)
  )

const walkBlock = (block: ts.Block): ReadonlyArray<string> =>
  Array.flatMap(block.statements, walkStatement)

const walkConciseBody = (body: ts.ConciseBody): ReadonlyArray<string> =>
  pipe(Match.value(body), Match.when(ts.isBlock, walkBlock), Match.orElse(walkExpression))

const unwrappedCurriedDefinition = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
): ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration =>
  pipe(
    Option.liftPredicate(ts.isArrowFunction)(node),
    Option.flatMap(conciseArrowBody),
    Option.map(unwrapTransparentExpression),
    Option.filter(ts.isArrowFunction),
    Option.map(unwrappedCurriedDefinition),
    Option.getOrElse(Function.constant(node))
  )

const fingerprintNames = (
  node: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
): ReadonlyArray<string> =>
  pipe(Option.fromNullishOr(node.body), Option.map(walkConciseBody), Option.getOrElse(Array.empty))

const compositionFingerprintElements =
  (index: ExportReferenceIndex) =>
  (context: MatchContext): ReadonlyArray<MatcherMatch<CompositionFingerprintData>> => {
    if (isTestSourceFile(context.workspaceRoot)(context.sourceFile)) {
      return Array.empty()
    }

    const isEntryInSourceFile = flow(
      Struct.get<(typeof index.entries)[number], "nameNode">("nameNode"),
      (nameNode) => nameNode.getSourceFile(),
      strictEqual(context.sourceFile)
    )

    return pipe(
      index.entries,
      Array.filter(isEntryInSourceFile),
      Array.filterMap((entry) => {
        const root = unwrappedCurriedDefinition(entry.functionNode)
        const names = fingerprintNames(root)

        if (names.length < minimumSteps) {
          return Result.failVoid
        }

        const fingerprint = Array.join(names, ">")

        const data = CompositionFingerprintData.make({
          projectPath: context.projectRoot,
          fingerprint,
          stepCount: names.length,
          exportName: entry.nameNode.text
        })

        const reported = makeNodeMatch(entry.nameNode, data)

        return Result.succeed(reported)
      })
    )
  }

const compositionFingerprintSubscriptions = Function.compose(
  compositionFingerprintElements,
  fileSubscriptions
)

export const compositionFingerprints = evidenceMatcher(exportReferenceIndex)(
  compositionFingerprintSubscriptions
)
