import { Array, Function, Match, Option, pipe } from "effect"

import * as ts from "typescript"

import { foldAst } from "../../sources/foldAst.js"

import { identifierIsQueueFamily } from "./queueFamilyNames.js"

const typeReferenceIsQueueFamily = (reference: ts.TypeReferenceNode) =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(reference.typeName),
    Option.exists(identifierIsQueueFamily)
  )

const matchQueueFamilyNode = (current: ts.Node) =>
  pipe(
    Match.value(current),
    Match.when(ts.isIdentifier, identifierIsQueueFamily),
    Match.when(ts.isTypeReferenceNode, typeReferenceIsQueueFamily),
    Match.orElse(Function.constFalse)
  )

export const typeNodeReferencesQueueFamily = (typeNode: ts.TypeNode) => {
  const reducer = (found: boolean, current: ts.Node) => {
    const matchesQueueFamily = matchQueueFamilyNode(current)
    const signals = Array.make(found, matchesQueueFamily)

    return Array.some(signals, Boolean)
  }

  return foldAst(reducer)(typeNode)(false)
}
