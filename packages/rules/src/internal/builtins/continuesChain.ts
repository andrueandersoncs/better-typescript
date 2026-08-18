import { Array, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { siblingDispatchGuard } from "./siblingDispatchGuard.js"

const identifierNames = (node: ts.Node): ReadonlyArray<string> => {
  const ownNames = ts.isIdentifier(node) ? Array.of(node.text) : Array.empty()
  const children = node.getChildren()
  const childNames = Array.flatMap(children, identifierNames)

  return Array.appendAll(ownNames, childNames)
}

// Compare guard discriminants because a dispatch ladder must inspect the same subject.
const discriminants = (ifStatement: ts.IfStatement) =>
  pipe(identifierNames(ifStatement.expression), HashSet.fromIterable)

export const continuesChain = (offset: number) => (ifStatement: ts.IfStatement) => {
  const sharesDiscriminant = (sibling: ts.IfStatement) => {
    const firstDiscriminants = discriminants(ifStatement)
    const secondDiscriminants = discriminants(sibling)
    const secondHasName = (name: string) => HashSet.has(secondDiscriminants, name)

    return HashSet.some(firstDiscriminants, secondHasName)
  }

  return pipe(siblingDispatchGuard(offset)(ifStatement), Option.exists(sharesDiscriminant))
}
