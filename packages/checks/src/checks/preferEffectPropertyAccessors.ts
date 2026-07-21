import { Array, Function, Option, Tuple, pipe, Struct, flow } from "effect"
import * as ts from "typescript"
import {
  isFunctionDefinition,
  unwrapTransparentExpression,
  type FunctionDefinition
} from "./support/tsNode.js"
import { unaryAdapter } from "./support/unaryAdapter.js"
import { makeCheck } from "../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const functionDefinitionKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.MethodDeclaration
)

const directPropertyAccessExpression = (expression: ts.Expression) =>
  pipe(unwrapTransparentExpression(expression), Option.liftPredicate(ts.isPropertyAccessExpression))

const hasNoOptionalChain = flow(
  Struct.get<ts.PropertyAccessExpression, "questionDotToken">("questionDotToken"),
  Option.fromNullishOr,
  Option.isNone
)

const identifierText = Struct.get<ts.Identifier, "text">("text")

const accessExpressionIsParameter = (parameterName: string) =>
  flow(
    Struct.get<ts.PropertyAccessExpression, "expression">("expression"),
    Option.liftPredicate(ts.isIdentifier),
    Option.map(identifierText),
    Option.exists(strictEqual(parameterName))
  )

const isDirectParameterPropertyAccess =
  (parameterName: string) => (access: ts.PropertyAccessExpression) => {
    const noOptionalChain = hasNoOptionalChain(access)
    const readsParameter = accessExpressionIsParameter(parameterName)(access)
    const conditions = Array.make(noOptionalChain, readsParameter)

    return Array.every(conditions, Boolean)
  }

const identifierBindingNameText = (name: ts.BindingName) =>
  pipe(Option.liftPredicate(ts.isIdentifier)(name), Option.map(Struct.get("text")))

const functionDefinitionName = (definition: FunctionDefinition) =>
  Option.fromNullishOr(definition.name)

const hasIndexSignature = (type: ts.Type) => {
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
  const match = makeDetection(context)
  const isRecord = isRecordType(checker)
  const propertyNameText = (name: ts.PropertyName) => name.getText(sourceFile)

  const ruleMatch = (node: ts.Node) => (access: ts.PropertyAccessExpression) => {
    const definition = Option.liftPredicate(isFunctionDefinition)(node)

    const variableDeclarationName = pipe(
      definition,
      Option.map(Struct.get("parent")),
      Option.flatMap(Option.liftPredicate(ts.isVariableDeclaration)),
      Option.map(Struct.get("name")),
      Option.flatMap(identifierBindingNameText)
    )

    const name = pipe(
      definition,
      Option.flatMap(functionDefinitionName),
      Option.map(propertyNameText),
      Option.orElse(Function.constant(variableDeclarationName)),
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

  const matches = (node: ts.Node): ReadonlyArray<Detection> =>
    pipe(
      unaryAdapter(node),
      Option.flatMap((adapter) => {
        const expression = Tuple.get(adapter, 3)
        const parameterName = Tuple.get(adapter, 2).text

        return pipe(
          directPropertyAccessExpression(expression),
          Option.filter(isDirectParameterPropertyAccess(parameterName))
        )
      }),
      Option.map(ruleMatch(node)),
      Option.toArray
    )

  return matches
}

export const preferEffectPropertyAccessors = makeCheck(
  "prefer-effect-property-accessors",
  functionDefinitionKinds,
  isFunctionDefinition,
  propertyAccessorMatches
)
