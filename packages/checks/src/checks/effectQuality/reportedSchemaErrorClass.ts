import { Array, Function, Match, Option, Predicate, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { classExtendsEffectApi, importedEffectApiAt } from "../functionalCoreEffect/support.js"
import { propertyNameText, unwrapCallee, unwrapTransparentExpression } from "../support/tsNode.js"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { makeRuleFinding } from "./makeFindings.js"
import { emptyHeritageClauses, heritageClauseIsExtends } from "./reportedSchemaModelsShared.js"

const schemaTaggedErrorNames = Array.make("TaggedErrorClass", "ErrorClass", "TaggedError")

const dataTaggedErrorNames = Array.make("TaggedError", "Error")

const errorNamePattern = /Error$|Failure$|Exception$/u

const classMemberIsTag = (member: ts.ClassElement) =>
  pipe(
    Option.liftPredicate(ts.isPropertyDeclaration)(member),
    Option.exists((property) =>
      pipe(
        propertyNameText(property.name),
        Option.exists((name) => name === "_tag")
      )
    )
  )

const classHasTagMember = (declaration: ts.ClassDeclaration) =>
  Array.some(declaration.members, classMemberIsTag)

const classNameLooksLikeError = (declaration: ts.ClassDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.name),
    Option.map(Struct.get("text")),
    Option.exists((name) => errorNamePattern.test(name))
  )

const heritageExpressionIsErrorConstructor = flow(
  unwrapTransparentExpression,
  unwrapCallee,
  (current) =>
    pipe(
      Match.value(current),
      Match.when(ts.isIdentifier, (identifier) => identifier.text === "Error"),
      Match.when(ts.isPropertyAccessExpression, (access) => access.name.text === "Error"),
      Match.orElse(Function.constFalse)
    )
)

const classExtendsBuiltinError = (declaration: ts.ClassDeclaration) => {
  const clauses = declaration.heritageClauses ?? emptyHeritageClauses

  return Array.some(clauses, (clause) => {
    const isExtends = heritageClauseIsExtends(clause)

    const extendsError = Array.some(clause.types, (heritage) =>
      heritageExpressionIsErrorConstructor(heritage.expression)
    )

    const checks = Array.make(isExtends, extendsError)

    return Array.every(checks, Boolean)
  })
}

const classExtendsDataTaggedError =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
    const clauses = declaration.heritageClauses ?? emptyHeritageClauses

    return Array.some(clauses, (clause) => {
      const isExtends = heritageClauseIsExtends(clause)

      const extendsDataTagged = Array.some(clause.types, (heritage) => {
        const callee = unwrapCallee(heritage.expression)

        return importedEffectApiAt(checker, callee, "Data", dataTaggedErrorNames)
      })

      const checks = Array.make(isExtends, extendsDataTagged)

      return Array.every(checks, Boolean)
    })
  }

const classAlreadySchemaTaggedError =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) =>
    Array.some(schemaTaggedErrorNames, (memberName) =>
      classExtendsEffectApi(checker, declaration, "Schema", memberName)
    )

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

const classDeclarationHasName = flow(
  (declaration: ts.ClassDeclaration) => Option.fromNullishOr(declaration.name),
  Option.isSome
)

export const schemaErrorClassFindings = (
  context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isClassDeclaration)(node),
    Option.filter(classDeclarationHasName),
    Option.filter(Predicate.not(classAlreadySchemaTaggedError(context.checker))),
    Option.filter(classLooksLikeHandRolledError(context.checker)),
    Option.map((declaration) => {
      const nameOption = Option.fromNullishOr(declaration.name)

      const evidence = pipe(
        nameOption,
        Option.map((name): ts.Node => name),
        Option.getOrElse(Function.constant(declaration))
      )

      const subject = pipe(
        nameOption,
        Option.map(Struct.get("text")),
        Option.getOrElse(Function.constant("Error"))
      )

      return makeRuleFinding("schema-error-class")(subject)(evidence)
    }),
    Option.toArray
  )
