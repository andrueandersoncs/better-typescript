import { Array } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import { emptyTypes } from "./emptyTypes.js"

import { typeSymbolName } from "./typeSymbolName.js"

const typeArgsOfTypeReference = (checker: ts.TypeChecker) => (type: ts.Type) => {
  const objectFlags = (type as ts.TypeReference).objectFlags ?? 0
  const isReference = (objectFlags & ts.ObjectFlags.Reference) !== 0

  return isReference ? checker.getTypeArguments(type as ts.TypeReference) : emptyTypes
}

export const typeMentionsConstructor =
  (checker: ts.TypeChecker) =>
  (name: string) =>
  (type: ts.Type): boolean => {
    const visit = (current: ts.Type, seen: ReadonlyArray<ts.Type>): boolean => {
      const previousEqualsCurrent = strictEqual(current)
      const alreadySeen = Array.some(seen, previousEqualsCurrent)
      const notSeen = strictEqual(false)(alreadySeen)
      const nextSeen = Array.append(seen, current)
      const symbolName = typeSymbolName(current)
      const matchesName = strictEqual(name)(symbolName)
      const unionParts = current.isUnionOrIntersection() ? current.types : emptyTypes
      const visitNext = (candidate: ts.Type) => visit(candidate, nextSeen)
      const unionMentions = Array.some(unionParts, visitNext)
      const typeArguments = typeArgsOfTypeReference(checker)(current)
      const argumentMentions = Array.some(typeArguments, visitNext)
      const rendered = checker.typeToString(current)
      const renderedMentions = rendered.includes(`${name}<`)
      const nestedFlags = Array.make(unionMentions, argumentMentions, renderedMentions)
      const hasStructural = Array.some(nestedFlags, Boolean)
      const matchFlags = Array.make(matchesName, hasStructural)
      const matches = Array.some(matchFlags, Boolean)
      const resultFlags = Array.make(notSeen, matches)

      return Array.every(resultFlags, Boolean)
    }

    return visit(type, emptyTypes)
  }
