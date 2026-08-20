import { effectQualityStructureKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, Option, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { classExtendsEffectApi } from "../../internal/support/effectApi/classExtendsEffectApi.js"

import { importedEffectApiAt } from "../../internal/support/effectApi/importedEffectApiAt.js"

import { importedMemberAt } from "../../internal/support/effectApi/importedMemberAt.js"

import { importedMemberSubject } from "../../internal/support/effectApi/importedMemberSubject.js"

import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

import { unwrapCallee } from "../../internal/support/unwrapCallee.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

const schemaClassModelNames = Array.make("Class", "TaggedClass")

const classExtendsSchemaModel = (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
  const extendsSchemaMember = Function.flip(classExtendsEffectApi(checker)("Schema"))(declaration)

  return Array.some(schemaClassModelNames, extendsSchemaMember)
}

const classQualityFromNode = (context: MatchContext) => (node: ts.Node) =>
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

      const targetNode = pipe(
        nameOption,
        Option.map((name): ts.Node => name),
        Option.getOrElse(Function.constant(declaration))
      )

      return makeSubjectMatch(subject)(targetNode)
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

const callIsSchemaClassModel = (checker: ts.TypeChecker) => {
  const isSchemaClassModel = importedEffectApiAt(checker)("Schema")(schemaClassModelNames)

  return flow(
    Struct.get<ts.CallExpression, "expression">("expression"),
    unwrapCallee,
    isSchemaClassModel
  )
}

const callHasSchemaClassArgumentShape = (call: ts.CallExpression) =>
  pipe(Array.head(call.arguments), Option.exists(schemaClassCallArgumentShape))

const callQualityFromNode = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.filter(callIsSchemaClassModel(context.checker)),
    Option.filter(callHasSchemaClassArgumentShape),
    Option.map((call) => {
      const callee = unwrapCallee(call.expression)
      const member = importedMemberAt(context.checker)(callee)
      const callText = call.expression.getText(context.sourceFile)
      const fallbackText = Function.constant(callText)

      const subject = pipe(
        member,
        Option.map(importedMemberSubject),
        Option.getOrElse(fallbackText)
      )

      return makeSubjectMatch(subject)(call.expression)
    })
  )

const schemaClassModelFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const fromClass = classQualityFromNode(context)(node)
    const fromCall = callQualityFromNode(context)(node)
    const candidates = Array.make(fromClass, fromCall)

    return pipe(candidates, Array.flatMap(Option.toArray))
  }

const schemaClassModelsScanner = makeNodeScanner(effectQualityStructureKinds)(acceptsNode)(
  schemaClassModelFindings
)

export const schemaClassModels = makeRule("schema-class-models")(schemaClassModelsScanner)(
  fixedRuleMessage(
    "Avoid Schema class data models; use Schema.Struct or tagged schema variants.",
    "Keep ordinary data declarative and decode it at the boundary."
  )
)
