import { Array, MutableList, MutableRef, Schema, Stream, pipe } from "effect"
import * as ts from "typescript"
import type { LoadedProject } from "../project/loadProject.js"
import { TsNode, TsProgram, TsSourceFile, TsTypeChecker } from "./tsSchema.js"

// The program context is born with the source stream: every element carries it.
export class ProgramContext extends Schema.Class<ProgramContext>(
  "ProgramContext"
)({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String
}) {}

export class SourceText extends Schema.Class<SourceText>("SourceText")({
  sourceFile: TsSourceFile,
  text: Schema.String
}) {}

export class AstNodeElement extends Schema.Class<AstNodeElement>(
  "AstNodeElement"
)({
  context: ProgramContext,
  sourceFile: TsSourceFile,
  node: TsNode
}) {}

export type AstFold<A> = (accumulator: A, node: ts.Node) => A

const isCheckableSourceFile = (sourceFile: ts.SourceFile): boolean => {
  const normalizedPath = sourceFile.fileName.replaceAll("\\", "/")
  const isInNodeModules = normalizedPath.includes("/node_modules/")
  const isSkippable = sourceFile.isDeclarationFile || isInNodeModules

  return !isSkippable
}

export const checkableSourceFiles = (
  project: LoadedProject
): Stream.Stream<ts.SourceFile, Error> =>
  pipe(
    project.program.getSourceFiles(),
    Array.filter(isCheckableSourceFile),
    Stream.fromIterable
  )

const sourceText = (sourceFile: ts.SourceFile): SourceText => {
  const text = sourceFile.getFullText()

  return new SourceText({ sourceFile, text })
}

export const fileTexts = (
  project: LoadedProject
): Stream.Stream<SourceText, Error> =>
  pipe(checkableSourceFiles(project), Stream.map(sourceText))

const recordChild =
  (children: MutableList.MutableList<ts.Node>) =>
  (child: ts.Node): false => {
    MutableList.append(children, child)

    return false
  }

export const astChildren = (node: ts.Node): ReadonlyArray<ts.Node> => {
  const children = MutableList.empty<ts.Node>()

  ts.forEachChild(node, recordChild(children))

  return Array.fromIterable(children)
}

export const foldAst =
  <A>(fold: AstFold<A>) =>
  (root: ts.Node) =>
  (initial: A): A => {
    const accumulator = MutableRef.make(initial)
    const visit = (node: ts.Node): false => {
      const current = MutableRef.get(accumulator)
      const folded = fold(current, node)
      MutableRef.set(accumulator, folded)
      ts.forEachChild(node, visit)

      return false
    }
    visit(root)

    return MutableRef.get(accumulator)
  }

const appendAstNode =
  (context: ProgramContext) =>
  (sourceFile: ts.SourceFile) =>
  (
    nodes: MutableList.MutableList<AstNodeElement>,
    node: ts.Node
  ): MutableList.MutableList<AstNodeElement> => {
    const element = new AstNodeElement({ context, sourceFile, node })

    return MutableList.append(nodes, element)
  }

const astNodeStream =
  (context: ProgramContext) =>
  (sourceFile: ts.SourceFile): Stream.Stream<AstNodeElement> => {
    const initial = MutableList.empty<AstNodeElement>()
    const append = appendAstNode(context)(sourceFile)
    const collected = foldAst(append)(sourceFile)(initial)
    const nodes = Array.fromIterable(collected)

    return Stream.fromIterable(nodes)
  }

export const astNodes = (
  project: LoadedProject
): Stream.Stream<AstNodeElement, Error> => {
  const checker = project.program.getTypeChecker()
  const context = new ProgramContext({
    program: project.program,
    checker,
    projectRoot: project.rootPath
  })

  return pipe(
    checkableSourceFiles(project),
    Stream.flatMap(astNodeStream(context))
  )
}
