import { Array, Function, pipe, Option, Struct } from "effect"
import * as ts from "typescript"
import { conciseArrowBody, unwrapTransparentExpression } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

/**
 * PropertyAccessorFunction is the syntax contract shared by property- accessor
 * candidate detection and matching.
 *
 * @remarks
 *   It remains explicit because both owners need one stable compiler-node
 *   vocabulary; removing it would duplicate the union and let their accepted
 *   declarations drift.
 * @modelRole shared
 */
export type PropertyAccessorFunction =
  ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration | ts.MethodDeclaration

const propertyAccessorFunctionKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.MethodDeclaration
)

const isPropertyAccessorFunction = (node: ts.Node): node is PropertyAccessorFunction => {
  const isArrowFunction = ts.isArrowFunction(node)
  const isFunctionExpression = ts.isFunctionExpression(node)
  const isFunctionDeclaration = ts.isFunctionDeclaration(node)
  const isMethodDeclaration = ts.isMethodDeclaration(node)

  const checks = Array.make(
    isArrowFunction,
    isFunctionExpression,
    isFunctionDeclaration,
    isMethodDeclaration
  )

  return Array.some(checks, Boolean)
}

const returnExpression = (statement: ts.Statement): Option.Option<ts.Expression> =>
  ts.isReturnStatement(statement) ? Option.fromNullable(statement.expression) : Option.none()

const singleReturnExpression = (body: ts.Block): Option.Option<ts.Expression> => {
  const hasSingleStatement = body.statements.length === 1

  const statement = hasSingleStatement
    ? Option.fromNullable(body.statements[0])
    : Option.none<ts.Statement>()

  return pipe(statement, Option.flatMap(returnExpression))
}

const directPropertyAccessExpression = (
  expression: ts.Expression
): Option.Option<ts.PropertyAccessExpression> =>
  pipe(unwrapTransparentExpression(expression), Option.liftPredicate(ts.isPropertyAccessExpression))

const identifierBindingNameText = (name: ts.BindingName): Option.Option<string> =>
  pipe(Option.liftPredicate(ts.isIdentifier)(name), Option.map(Struct.get("text")))

const identifierParameterName = (parameter: ts.ParameterDeclaration): Option.Option<string> =>
  identifierBindingNameText(parameter.name)

const hasIndexSignature = (type: ts.Type): boolean => {
  const stringIndex = type.getStringIndexType()
  const stringIndexType = Option.fromNullable(stringIndex)
  const hasStringIndex = Option.isSome(stringIndexType)
  const numberIndex = type.getNumberIndexType()
  const numberIndexType = Option.fromNullable(numberIndex)
  const hasNumberIndex = Option.isSome(numberIndexType)

  return hasStringIndex || hasNumberIndex
}

const isRecordType =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): boolean => {
    const apparentType = checker.getApparentType(type)
    const typeHasIndexSignature = hasIndexSignature(type)
    const apparentTypeHasIndexSignature = hasIndexSignature(apparentType)

    const conditions = Array.make(typeHasIndexSignature, apparentTypeHasIndexSignature)

    return type.isUnionOrIntersection()
      ? Array.every(type.types, isRecordType(checker))
      : Array.some(conditions, Boolean)
  }

const propertyAccessorMatches = (context: CheckContext) => {
  const checker = context.checker
  const sourceFile = context.sourceFile
  const match = detection(context)
  const isRecord = isRecordType(checker)

  const propertyNameText = (name: ts.PropertyName): string => name.getText(sourceFile)

  const ruleMatch =
    (node: PropertyAccessorFunction) =>
    (access: ts.PropertyAccessExpression): Detection => {
      const name = pipe(
        Option.fromNullable(node.name),
        Option.map(propertyNameText),
        Option.orElse(() =>
          pipe(
            Option.liftPredicate(ts.isVariableDeclaration)(node.parent),
            Option.map(Struct.get("name")),
            Option.flatMap(identifierBindingNameText)
          )
        ),
        Option.getOrElse(Function.constant("this function"))
      )

      const accessedText = access.getText(sourceFile)
      const accessedType = checker.getTypeAtLocation(access.expression)
      const moduleName = isRecord(accessedType) ? "Record" : "Struct"
      const propertyKey = JSON.stringify(access.name.text)
      const suggestion = `${moduleName}.get(${propertyKey})`

      return match({
        node: access,
        message: `Avoid defining ${name} only to read ${accessedText}.`,
        hint:
          `Replace this property-access-only function with ${suggestion} from Effect. ` +
          "Use Struct.get for non-record data types, and Record.get or Record.has for records."
      })
    }

  const matches = (node: PropertyAccessorFunction): ReadonlyArray<Detection> => {
    const hasSingleParam = node.parameters.length === 1

    const singleParam = hasSingleParam
      ? Option.fromNullable(node.parameters[0])
      : Option.none<ts.ParameterDeclaration>()

    const paramName = pipe(singleParam, Option.flatMap(identifierParameterName))

    return pipe(
      paramName,
      Option.flatMap((parameterName) => {
        const implicitExpression = pipe(
          Option.liftPredicate(ts.isArrowFunction)(node),
          Option.flatMap(conciseArrowBody)
        )

        const blockExpression = pipe(
          Option.fromNullable(node.body),
          Option.filter(ts.isBlock),
          Option.flatMap(singleReturnExpression)
        )

        const expressionCandidates = Array.make(implicitExpression, blockExpression)

        return pipe(
          Option.firstSomeOf(expressionCandidates),
          Option.flatMap(directPropertyAccessExpression),
          Option.filter((access) =>
            pipe(
              Option.liftPredicate(ts.isIdentifier)(access.expression),
              Option.exists((identifier) => identifier.text === parameterName)
            )
          )
        )
      }),
      Option.map(ruleMatch(node)),
      Option.toArray
    )
  }

  return matches
}

const check = nodeCheck(propertyAccessorFunctionKinds)(isPropertyAccessorFunction)(
  propertyAccessorMatches
)

export const preferEffectPropertyAccessors: Check = check

export const preferEffectPropertyAccessorsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-property-accessors")
