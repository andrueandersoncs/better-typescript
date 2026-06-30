import * as ts from "typescript"

// forEachChild callback must not return truthy or traversal stops early; false satisfies this without void or undefined.
const recordChild =
  (children: Array<ts.Node>) =>
  (child: ts.Node): false => {
    children[children.length] = child

    return false
  }

export const astChildren = (node: ts.Node): ReadonlyArray<ts.Node> => {
  const children: Array<ts.Node> = []

  ts.forEachChild(node, recordChild(children))

  return children
}
