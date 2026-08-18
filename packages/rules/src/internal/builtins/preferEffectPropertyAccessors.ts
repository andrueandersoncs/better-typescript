import { Array, Function, Option, Schema, Struct, Tuple, flow, pipe } from "effect"
import * as ts from "typescript"
import { functionDefinitionScanner } from "./functionDefinitionScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import type { FunctionDefinition } from "../support/functionDefinition.js"
import { isFunctionDefinition } from "../support/isFunctionDefinition.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"
import { unaryAdapter } from "../support/unaryAdapter.js"
import { strictEqual } from "../equivalence.js"

const propertyAccessorModules = Array.make<["Record", "Struct"]>("Record", "Struct")

const moduleNameSchema = Schema.Literals(propertyAccessorModules)

// PreferEffectPropertyAccessorsFact records accessor misuse because Record and Struct differ.
export const PreferEffectPropertyAccessorsFact = Schema.Struct({
  name: Schema.String,
  accessedText: Schema.String,
  moduleName: moduleNameSchema,
  propertyKey: Schema.String
})

export interface PreferEffectPropertyAccessorsFact extends Schema.Schema.Type<
  typeof PreferEffectPropertyAccessorsFact
> {}

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

const functionDefinitionName = (scan: FunctionDefinition) => Option.fromNullishOr(scan.name)

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

const propertyAccessorMatches = (context: MatchContext) => {
  const isRecord = isRecordType(context.checker)
  const propertyNameText = (name: ts.PropertyName) => name.getText(context.sourceFile)

  const factFor = (node: ts.Node) => (access: ts.PropertyAccessExpression) => {
    const scan = Option.liftPredicate(isFunctionDefinition)(node)

    const variableDeclarationName = pipe(
      scan,
      Option.map(Struct.get("parent")),
      Option.flatMap(Option.liftPredicate(ts.isVariableDeclaration)),
      Option.map(Struct.get("name")),
      Option.flatMap(identifierBindingNameText)
    )

    const name = pipe(
      scan,
      Option.flatMap(functionDefinitionName),
      Option.map(propertyNameText),
      Option.orElse(Function.constant(variableDeclarationName)),
      Option.getOrElse(Function.constant("this function"))
    )

    const accessedText = access.getText(context.sourceFile)
    const accessedType = context.checker.getTypeAtLocation(access.expression)
    const moduleName = isRecord(accessedType) ? ("Record" as const) : ("Struct" as const)
    const propertyKey = JSON.stringify(access.name.text)

    const fact = PreferEffectPropertyAccessorsFact.make({
      name,
      accessedText,
      moduleName,
      propertyKey
    })

    return makeNodeMatch(access, fact)
  }

  const matches = (node: ts.Node) =>
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
      Option.map(factFor(node)),
      Option.toArray
    )

  return matches
}

export const preferEffectPropertyAccessorsScanner =
  functionDefinitionScanner(propertyAccessorMatches)
