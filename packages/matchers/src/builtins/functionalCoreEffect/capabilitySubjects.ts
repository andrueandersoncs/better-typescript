import { Array, Option, Tuple, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import { isProjectFile } from "../../support/tsNode.js"
import type { FunctionalCoreEffectPolicy } from "./policy.js"
import {
  ImportedMember,
  importedMemberAt,
  declarationsOfSymbol,
  expressionPath
} from "./importedMembers.js"
import { importedMemberIsMovedPlatformCapability } from "./movedPlatformCapabilities.js"
import { moduleMatchesPolicyPrefix } from "./moduleResolution.js"

const symbolIsAmbient = (checker: ts.TypeChecker, identifier: ts.Identifier) =>
  pipe(
    checker.getSymbolAtLocation(identifier),
    Option.fromNullishOr,
    Option.map(declarationsOfSymbol),
    Option.exists((declarations) => {
      const hasDeclaration = declarations.length > 0

      const hasProjectDeclaration = Array.some(
        declarations,
        flow((declaration) => declaration.getSourceFile(), isProjectFile)
      )

      const notProjectDeclaration = !hasProjectDeclaration
      const ambientFlags = Array.make(hasDeclaration, notProjectDeclaration)

      return Array.every(ambientFlags, Boolean)
    })
  )

const ambientPathAt = (
  checker: ts.TypeChecker,
  expression: ts.Expression
): Option.Option<ReadonlyArray<string>> => {
  const pathRootIsAmbient = (path: readonly [ts.Identifier, ReadonlyArray<string>]) => {
    const root = Tuple.get(path, 0)

    return symbolIsAmbient(checker, root)
  }

  const ambientPathSegments = (path: readonly [ts.Identifier, ReadonlyArray<string>]) => {
    const root = Tuple.get(path, 0)
    const members = Tuple.get(path, 1)

    return Array.prepend(members, root.text)
  }

  return pipe(
    expressionPath(expression),
    Option.filter(pathRootIsAmbient),
    Option.map(ambientPathSegments)
  )
}

const ambientDirectNames = Array.make(
  "fetch",
  "setTimeout",
  "setInterval",
  "setImmediate",
  "queueMicrotask"
)

const ambientExactMembers = Array.make("Date.now", "Math.random", "crypto.randomUUID")

const ambientCallSubject = (checker: ts.TypeChecker, expression: ts.Expression) =>
  pipe(
    ambientPathAt(checker, expression),
    Option.filter((path) => {
      const joined = Array.join(path, ".")
      const isSingleSegment = strictEqual(1)(path.length)
      const directMatch = isSingleSegment && Array.contains(ambientDirectNames, joined)
      const exactMatch = Array.contains(ambientExactMembers, joined)
      const receiver = Array.get(path, 0)
      const isLocalStorage = pipe(receiver, Option.contains("localStorage"))
      const isSessionStorage = pipe(receiver, Option.contains("sessionStorage"))
      const storageMatch = isLocalStorage || isSessionStorage
      const consoleMatch = pipe(receiver, Option.contains("console"))
      const ambientFlags = Array.make(directMatch, exactMatch, storageMatch, consoleMatch)

      return Array.some(ambientFlags, Boolean)
    }),
    Option.map(Array.join("."))
  )

export const capabilitySubjectAt = (
  context: MatchContext,
  policy: FunctionalCoreEffectPolicy,
  node: ts.CallExpression | ts.NewExpression
) => {
  const pathTextEquals = flow(Array.join("."), strictEqual("Date"))

  const pipeOf6 = (expression: ts.CallExpression | ts.NewExpression) =>
    pipe(
      ambientPathAt(context.checker, expression.expression),
      Option.filter(pathTextEquals),
      Option.as("new Date")
    )

  const expressionHasNoArguments = (expression: ts.NewExpression) =>
    strictEqual(0)(expression.arguments?.length ?? 0)

  const newDate = pipe(
    Option.liftPredicate(ts.isNewExpression)(node),
    Option.filter(expressionHasNoArguments),
    Option.flatMap(pipeOf6)
  )

  const ambient = ambientCallSubject(context.checker, node.expression)

  const memberMatchesPolicyPrefix = (member: ImportedMember) =>
    moduleMatchesPolicyPrefix(policy, member.moduleSpecifier) ||
    importedMemberIsMovedPlatformCapability(member)

  const imported = pipe(
    importedMemberAt(context.checker, node.expression),
    Option.filter(memberMatchesPolicyPrefix),
    Option.map((member) => {
      const memberPath = Array.join(member.path, ".")
      return `${member.moduleSpecifier}:${memberPath}`
    })
  )

  const candidates = Array.make(newDate, ambient, imported)

  return Option.firstSomeOf(candidates)
}

const pathTextEquals2 = flow(Array.join("."), strictEqual("process.env"))

export const ambientCapabilityPropertySubject = (
  context: MatchContext,
  node: ts.PropertyAccessExpression
) =>
  pipe(
    ambientPathAt(context.checker, node),
    Option.filter(pathTextEquals2),
    Option.map(Array.join("."))
  )
