import * as ts from "typescript"

// forEachChild callback must not return truthy or traversal stops early; false satisfies this without void or undefined.
const recordChild = (children: Map<number, ts.Node>) => (child: ts.Node): false => {
  children.set(children.size, child)

  return false
}

export const astChildren = (node: ts.Node): ReadonlyArray<ts.Node> => {
  const children = new Map<number, ts.Node>()

  ts.forEachChild(node, recordChild(children))

  return [...children.values()]
}
