import { Array, Function, pipe, Option, Struct } from "effect"
import * as ts from "typescript"
import {
  conciseArrowBody,
  isFunctionDefinition,
  unwrapTransparentExpression
} from "./support/tsNode.js"
import { defineCheck } from "../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { detection } from "@better-typescript/core/engine/check"

const functionDefinitionKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.MethodDeclaration
)

const returnExpression = (statement: ts.Statement): Option.Option<ts.Expression> =>
  ts.isReturnStatement(statement) ? Option.fromNullishOr(statement.expression) : Option.none()

const singleReturnExpression = (body: ts.Block): Option.Option<ts.Expression> => {
  const hasSingleStatement = body.statements.length === 1

  const statement = hasSingleStatement
    ? Option.fromNullishOr(body.statements[0])
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
  const stringIndexType = Option.fromNullishOr(stringIndex)
  const hasStringIndex = Option.isSome(stringIndexType)
  const numberIndex = type.getNumberIndexType()
  const numberIndexType = Option.fromNullishOr(numberIndex)
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
    (node: ts.Node) =>
    (access: ts.PropertyAccessExpression): Detection => {
      const definition = Option.liftPredicate(isFunctionDefinition)(node)

      const name = pipe(
        definition,
        Option.flatMap((functionDefinition) => Option.fromNullishOr(functionDefinition.name)),
        Option.map(propertyNameText),
        Option.orElse(() =>
          pipe(
            definition,
            Option.map(Struct.get("parent")),
            Option.flatMap(Option.liftPredicate(ts.isVariableDeclaration)),
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

  const matches = (node: ts.Node): ReadonlyArray<Detection> => {
    if (!isFunctionDefinition(node)) {
      return Array.empty()
    }

    const hasSingleParam = node.parameters.length === 1

    const singleParam = hasSingleParam
      ? Option.fromNullishOr(node.parameters[0])
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
          Option.fromNullishOr(node.body),
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

export const preferEffectPropertyAccessors = defineCheck(
  "prefer-effect-property-accessors",
  functionDefinitionKinds,
  isFunctionDefinition,
  propertyAccessorMatches
)
