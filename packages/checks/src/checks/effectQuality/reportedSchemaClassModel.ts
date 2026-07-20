import { Array, Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import {
  classExtendsEffectApi,
  importedEffectApiAt,
  importedMemberAt,
  importedMemberSubject
} from "../functionalCoreEffect/support.js"
import { unwrapCallee, unwrapTransparentExpression } from "../support/tsNode.js"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { makeRuleFinding } from "./makeFindings.js"

const schemaClassModelNames = Array.make("Class", "TaggedClass")

const classExtendsSchemaModel = (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
  const extendsSchemaMember = (memberName: string) =>
    classExtendsEffectApi(checker, declaration, "Schema", memberName)

  return Array.some(schemaClassModelNames, extendsSchemaMember)
}

const classQualityFromNode = (context: CheckContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isClassDeclaration)(node),
    Option.filter(classExtendsSchemaModel(context.checker)),
    Option.map((declaration) => {
      const nameOption = Option.fromNullishOr(declaration.name)

      const subject = pipe(
        nameOption,
        Option.map(Struct.get("text")),
        Option.getOrElse(Function.constant("Schema.Class"))
      )

      const evidence = pipe(
        nameOption,
        Option.map((name): ts.Node => name),
        Option.getOrElse(Function.constant(declaration))
      )

      return makeRuleFinding("schema-class-models")(subject)(evidence)
    })
  )

const schemaClassCallArgumentShape = (argument: ts.Expression) => {
  const current = unwrapTransparentExpression(argument)
  const isFields = ts.isObjectLiteralExpression(current)
  const isIdentifier = ts.isIdentifier(current)
  const isCall = ts.isCallExpression(current)
  const structCandidates = Array.make(isIdentifier, isCall)
  const isStructSchema = Array.some(structCandidates, Boolean)
  const checks = Array.make(isFields, isStructSchema)

  return Array.some(checks, Boolean)
}

const callIsSchemaClassModel = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const callee = unwrapCallee(call.expression)

  return importedEffectApiAt(checker, callee, "Schema", schemaClassModelNames)
}

const callHasSchemaClassArgumentShape = (call: ts.CallExpression) =>
  pipe(Array.head(call.arguments), Option.exists(schemaClassCallArgumentShape))

const callQualityFromNode = (context: CheckContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.filter(callIsSchemaClassModel(context.checker)),
    Option.filter(callHasSchemaClassArgumentShape),
    Option.map((call) => {
      const callee = unwrapCallee(call.expression)
      const member = importedMemberAt(context.checker, callee)
      const callText = call.expression.getText(context.sourceFile)
      const fallbackText = Function.constant(callText)

      const subject = pipe(
        member,
        Option.map(importedMemberSubject),
        Option.getOrElse(fallbackText)
      )

      return makeRuleFinding("schema-class-models")(subject)(call.expression)
    })
  )

export const schemaClassModelFindings = (
  context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const fromClass = classQualityFromNode(context)(node)
  const fromCall = callQualityFromNode(context)(node)
  const candidates = Array.make(fromClass, fromCall)

  return pipe(candidates, Array.flatMap(Option.toArray))
}
