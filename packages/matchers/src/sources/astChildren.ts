import * as ts from "typescript"
import { MutableList } from "effect"

export const astChildren = (node: ts.Node): ReadonlyArray<ts.Node> => {
  const children = MutableList.make<ts.Node>()

  ts.forEachChild(node, (child) => {
    MutableList.append(children, child)

    return false
  })

  return MutableList.toArray(children)
}
