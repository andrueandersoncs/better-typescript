import { Function, HashMap, MutableRef, Option, Tuple, flow, pipe } from "effect"
import type * as ts from "typescript"
import { strictEqual } from "../../equivalence.js"
import { expressionPath } from "./expressionPath.js"
import { importedMemberFromPath } from "./importBindingAt.js"
import { importedMemberCache } from "./importedMemberCache.js"
import type { ImportedMember } from "./importedMember.js"

const emptyCache = HashMap.empty<string, Option.Option<ImportedMember>>()

const importedMembersFor = (checker: ts.TypeChecker) => {
  const checkerMatches: (entry: readonly [ts.TypeChecker, unknown]) => boolean = flow(
    Tuple.get(0),
    strictEqual(checker)
  )

  return pipe(
    MutableRef.get(importedMemberCache),
    Option.filter(checkerMatches),
    Option.map(Tuple.get(1)),
    Option.getOrElse(Function.constant(emptyCache))
  )
}

const expressionKey = (expression: ts.Expression) => {
  const sourceFile = expression.getSourceFile()

  return `${sourceFile.fileName}:${expression.pos}:${expression.end}:${expression.kind}`
}

export const importedMemberAt = (checker: ts.TypeChecker, expression: ts.Expression) => {
  const cache = importedMembersFor(checker)
  const key = expressionKey(expression)
  const cached = HashMap.get(cache, key)

  if (Option.isSome(cached)) {
    return cached.value
  }

  const memberFromPath = (path: readonly [ts.Identifier, ReadonlyArray<string>]) =>
    importedMemberFromPath(checker, path)

  const member = pipe(expressionPath(expression), Option.flatMap(memberFromPath))
  const nextCache = HashMap.set(cache, key, member)
  const cacheEntry = Tuple.make(checker, nextCache)
  const nextEntry = Option.some(cacheEntry)

  MutableRef.set(importedMemberCache, nextEntry)

  return member
}
