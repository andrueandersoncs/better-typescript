import { Stream } from "effect"
import * as ts from "typescript"

export const nodeStream = (node: ts.Node): Stream.Stream<ts.Node> => {
  return Stream.succeed(node).pipe(
    Stream.concat(childNodeStream(node).pipe(Stream.flatMap(nodeStream)))
  )
}

export const childNodeStream = (node: ts.Node): Stream.Stream<ts.Node> => {
  return Stream.fromIterable(childNodes(node))
}

const childNodes = (node: ts.Node): ReadonlyArray<ts.Node> => {
  const children: Array<ts.Node> = []

  ts.forEachChild(node, (child) => {
    children.push(child)
  })

  return children
}
