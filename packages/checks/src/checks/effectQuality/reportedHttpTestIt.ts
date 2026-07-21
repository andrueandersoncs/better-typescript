import { Array, Option, pipe, Struct, flow } from "effect"
import * as ts from "typescript"
import { importedMemberAt, type ImportedMember } from "../functionalCoreEffect/support.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const effectVitestModules = Array.make("@effect/vitest", "@effect/vitest/index")

const plainItMethods = Array.make("only", "skip", "todo", "concurrent", "sequential")

const moduleIsEffectVitest = (moduleSpecifier: string) =>
  Array.some(effectVitestModules, (candidate) => {
    const exact = strictEqual(candidate)(moduleSpecifier)
    const nested = moduleSpecifier.startsWith(`${candidate}/`)
    const flags = Array.make(exact, nested)

    return Array.some(flags, Boolean)
  })

const memberIsEffectVitestIt = (member: ImportedMember) => {
  const vitestModule = moduleIsEffectVitest(member.moduleSpecifier)
  const singlePath = strictEqual(1)(member.path.length)
  const pathHead = Array.get(member.path, 0)
  const namedIt = pipe(pathHead, Option.contains("it"))
  const flags = Array.make(vitestModule, singlePath, namedIt)

  return Array.every(flags, Boolean)
}

const expressionIsEffectVitestIt = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const unwrapped = unwrapTransparentExpression(expression)
  const member = importedMemberAt(checker, unwrapped)

  return Option.exists(member, memberIsEffectVitestIt)
}

const identifierTextIsIt = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("it"))

const identifierIsIt = (expression: ts.Expression) =>
  pipe(Option.liftPredicate(ts.isIdentifier)(expression), Option.exists(identifierTextIsIt))

// Bare it("name", cb) is plain style because it.effect is the Effect-aware entry.
const bareItCall =
  (isVitestIt: (expression: ts.Expression) => boolean) => (callee: ts.Expression) =>
    pipe(
      Option.liftPredicate(ts.isIdentifier)(callee),
      Option.filter(identifierTextIsIt),
      Option.exists(isVitestIt)
    )

const propertyItCall =
  (isVitestIt: (expression: ts.Expression) => boolean) => (callee: ts.Expression) =>
    pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
      Option.exists((access) => {
        const root = unwrapTransparentExpression(access.expression)
        const method = access.name.text
        const isPlainMethod = Array.contains(plainItMethods, method)
        const rootNamedIt = identifierIsIt(root)
        const vitestIt = isVitestIt(root)
        const flags = Array.make(rootNamedIt, isPlainMethod, vitestIt)

        return Array.every(flags, Boolean)
      })
    )

// it.each(...)("name", cb) is still plain because the effect form is it.effect.
const callExpressionPropertyAccess = (call: ts.CallExpression) =>
  Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression)

const eachItCall =
  (isVitestIt: (expression: ts.Expression) => boolean) => (callee: ts.Expression) =>
    pipe(
      Option.liftPredicate(ts.isCallExpression)(callee),
      Option.flatMap(callExpressionPropertyAccess),
      Option.exists((access) => {
        const root = unwrapTransparentExpression(access.expression)
        const rootNamedIt = identifierIsIt(root)
        const isEach = strictEqual("each")(access.name.text)
        const vitestIt = isVitestIt(root)
        const flags = Array.make(rootNamedIt, isEach, vitestIt)

        return Array.every(flags, Boolean)
      })
    )

export const callIsPlainIt = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const callee = unwrapTransparentExpression(call.expression)
  const isVitestIt = expressionIsEffectVitestIt(checker)
  const bare = bareItCall(isVitestIt)(callee)
  const property = propertyItCall(isVitestIt)(callee)
  const each = eachItCall(isVitestIt)(callee)
  const flags = Array.make(bare, property, each)

  return Array.some(flags, Boolean)
}
