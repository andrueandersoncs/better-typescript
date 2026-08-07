import { Function } from "effect"

import * as ts from "typescript"

import { foldAst } from "../../sources/foldAst.js"

const bodyContainsAny =
  (predicate: (node: ts.Node) => boolean) => (found: boolean, current: ts.Node) =>
    found || predicate(current)

export const functionBodyContains =
  (predicate: (node: ts.Node) => boolean) => (body: ts.ConciseBody) => {
    const step = bodyContainsAny(predicate)
    const scan = Function.flip(foldAst(step))(false)

    return scan(body)
  }
