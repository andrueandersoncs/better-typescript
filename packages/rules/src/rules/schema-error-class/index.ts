import { emptyHeritageClauses } from "../../internal/support/effectApi/emptyHeritageClauses.js"
import { effectQualityStructureKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import {
  Array,
  Match as EffectMatch,
  Function,
  Option,
  Predicate,
  Struct,
  flow,
  pipe
} from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { classDeclarationName } from "../../internal/support/classDeclarationName.js"

import { classExtendsEffectApi } from "../../internal/support/effectApi/classExtendsEffectApi.js"

import { importedEffectApiAt } from "../../internal/support/effectApi/importedEffectApiAt.js"

import { propertyNameText } from "../../internal/support/propertyNameText.js"

import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

import { unwrapCallee } from "../../internal/support/unwrapCallee.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

import { heritageClauseIsExtends } from "../../internal/builtins/effectQuality/schemaRulesShared.js"

const schemaTaggedErrorNames = Array.make("TaggedErrorClass", "ErrorClass", "TaggedError")

const dataTaggedErrorNames = Array.make("TaggedError", "Error")

const errorNamePattern = /Error$|Failure$|Exception$/u

const propertyNameIsTag = strictEqual("_tag")

const propertyDeclarationIsTag = (property: ts.PropertyDeclaration) =>
  pipe(propertyNameText(property.name), Option.exists(propertyNameIsTag))

const classMemberIsTag = (member: ts.ClassElement) =>
  pipe(
    Option.liftPredicate(ts.isPropertyDeclaration)(member),
    Option.exists(propertyDeclarationIsTag)
  )

const classHasTagMember = (declaration: ts.ClassDeclaration) =>
  Array.some(declaration.members, classMemberIsTag)

const nameMatchesErrorPattern = (name: string) => errorNamePattern.test(name)

const classNameLooksLikeError = (declaration: ts.ClassDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.name),
    Option.map(Struct.get("text")),
    Option.exists(nameMatchesErrorPattern)
  )

const identifierIsError = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Error"))

const propertyAccessIsError = (access: ts.PropertyAccessExpression) =>
  strictEqual("Error")(access.name.text)

const nodeIsErrorConstructor = (current: ts.Expression) =>
  pipe(
    EffectMatch.value(current),
    EffectMatch.when(ts.isIdentifier, identifierIsError),
    EffectMatch.when(ts.isPropertyAccessExpression, propertyAccessIsError),
    EffectMatch.orElse(Function.constFalse)
  )

const heritageExpressionIsErrorConstructor = flow(
  unwrapTransparentExpression,
  unwrapCallee,
  nodeIsErrorConstructor
)

const heritageTypeIsErrorConstructor = (heritage: ts.ExpressionWithTypeArguments) =>
  heritageExpressionIsErrorConstructor(heritage.expression)

const classExtendsBuiltinError = (declaration: ts.ClassDeclaration) => {
  const clauses = declaration.heritageClauses ?? emptyHeritageClauses

  return Array.some(clauses, (clause) => {
    const isExtends = heritageClauseIsExtends(clause)
    const extendsError = Array.some(clause.types, heritageTypeIsErrorConstructor)
    const checks = Array.make(isExtends, extendsError)

    return Array.every(checks, Boolean)
  })
}

const classExtendsDataTaggedError =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
    const clauses = declaration.heritageClauses ?? emptyHeritageClauses

    return Array.some(clauses, (clause) => {
      const isExtends = heritageClauseIsExtends(clause)
      const isDataTaggedError = importedEffectApiAt(checker)("Data")(dataTaggedErrorNames)

      const heritageExtendsDataTagged = flow(
        Struct.get<ts.ExpressionWithTypeArguments, "expression">("expression"),
        unwrapCallee,
        isDataTaggedError
      )

      const extendsDataTagged = Array.some(clause.types, heritageExtendsDataTagged)
      const checks = Array.make(isExtends, extendsDataTagged)

      return Array.every(checks, Boolean)
    })
  }

const classAlreadySchemaTaggedError =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
    const extendsSchemaMember = Function.flip(classExtendsEffectApi(checker)("Schema"))(declaration)

    return Array.some(schemaTaggedErrorNames, extendsSchemaMember)
  }

const classLooksLikeHandRolledError =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
    const tagged = classHasTagMember(declaration)
    const dataTagged = classExtendsDataTaggedError(checker)(declaration)
    const errorHeritage = classExtendsBuiltinError(declaration)
    const errorName = classNameLooksLikeError(declaration)
    const errorLikeCandidates = Array.make(errorHeritage, errorName, dataTagged)
    const errorLike = Array.some(errorLikeCandidates, Boolean)
    const handRolledCandidates = Array.make(tagged, dataTagged)
    const handRolled = Array.some(handRolledCandidates, Boolean)
    const checks = Array.make(handRolled, errorLike)

    return Array.every(checks, Boolean)
  }

const classDeclarationHasName = flow(classDeclarationName, Option.isSome)

const schemaErrorClassFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      Option.liftPredicate(ts.isClassDeclaration)(node),
      Option.filter(classDeclarationHasName),
      Option.filter(Predicate.not(classAlreadySchemaTaggedError(context.checker))),
      Option.filter(classLooksLikeHandRolledError(context.checker)),
      Option.map((declaration) => {
        const nameOption = Option.fromNullishOr(declaration.name)

        const targetNode = pipe(
          nameOption,
          Option.map((name): ts.Node => name),
          Option.getOrElse(Function.constant(declaration))
        )

        const subject = pipe(
          nameOption,
          Option.map(Struct.get("text")),
          Option.getOrElse(Function.constant("Error"))
        )

        return makeSubjectMatch(subject)(targetNode)
      }),
      Option.toArray
    )

const schemaErrorClassScanner = makeNodeScanner(effectQualityStructureKinds)(acceptsNode)(
  schemaErrorClassFindings
)

export const schemaErrorClass = makeRule("schema-error-class")(schemaErrorClassScanner)(
  fixedRuleMessage(
    "Use Schema.TaggedErrorClass for typed Effect errors.",
    "Map boundary failures into a tagged schema error with useful operation context."
  )
)
