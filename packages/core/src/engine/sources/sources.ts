import { Array, Iterable, MutableList, Option, Tuple } from "effect"
import * as ts from "typescript"
import { ProgramContext } from "./data.js"

export type AstFold<A> = (accumulator: A, node: ts.Node) => A

export const isProjectSourceFile = (sourceFile: ts.SourceFile) => {
  const normalizedPath = sourceFile.fileName.replaceAll("\\", "/")
  const isInNodeModules = normalizedPath.includes("/node_modules/")
  const isSkippable = sourceFile.isDeclarationFile || isInNodeModules

  return !isSkippable
}

export const makeContext = (projectRoot: string) => (program: ts.Program) => {
  const checker = program.getTypeChecker()

  // Standalone loads treat the project as its own workspace because no wider root is known here.
  return ProgramContext.make({ program, checker, projectRoot, workspaceRoot: projectRoot })
}

export const astChildren = (node: ts.Node): ReadonlyArray<ts.Node> => {
  const children = MutableList.make<ts.Node>()

  ts.forEachChild(node, (child) => {
    MutableList.append(children, child)

    return false
  })

  return MutableList.toArray(children)
}

// Explicit stack traversal is required because TypeScript trees can exceed the JS call stack.
export const astNodesIn = (root: ts.Node) => {
  const initial: ReadonlyArray<ts.Node> = Array.of(root)

  return Iterable.unfold(initial, (pending) => {
    if (Array.isReadonlyArrayEmpty(pending)) {
      return Option.none()
    }

    const node = pending[0]
    const children = astChildren(node)
    const rest = Array.drop(pending, 1)
    const next: ReadonlyArray<ts.Node> = Array.appendAll(children, rest)
    const entry = Tuple.make(node, next)
    return Option.some(entry)
  })
}

export const foldAst =
  <A>(fold: AstFold<A>) =>
  (root: ts.Node) =>
  (initial: A): A => {
    const nodes = astNodesIn(root)

    return Iterable.reduce(nodes, initial, fold)
  }
