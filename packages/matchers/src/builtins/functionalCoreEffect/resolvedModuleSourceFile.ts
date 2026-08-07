import { Array, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import type { MatchContext } from "../../matcher/matchContext.js"
import { declarationsOfSymbol } from "./declarationsOfSymbol.js"

export const resolvedModuleSourceFile = (
  context: MatchContext,
  declaration: ts.ImportDeclaration | ts.ExportDeclaration
) => {
  const findFirstOf = (declarations: ReadonlyArray<ts.Declaration>) =>
    Array.findFirst(declarations, ts.isSourceFile)

  const pipeOf4 = (specifier: ts.Node) =>
    pipe(
      context.checker.getSymbolAtLocation(specifier),
      Option.fromNullishOr,
      Option.map(declarationsOfSymbol),
      Option.flatMap(findFirstOf)
    )

  const checkerSource = pipe(
    Option.fromNullishOr(declaration.moduleSpecifier),
    Option.flatMap(pipeOf4)
  )

  if (Option.isSome(checkerSource)) {
    return checkerSource
  }

  const specifier = pipe(
    Option.fromNullishOr(declaration.moduleSpecifier),
    Option.filter(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

  const pipeOf5 = (resolved: ts.ResolvedModuleFull) =>
    pipe(context.program.getSourceFile(resolved.resolvedFileName), Option.fromNullishOr)

  return pipe(
    specifier,
    Option.flatMap((text) => {
      const compilerOptions = context.program.getCompilerOptions()

      const resolution = ts.resolveModuleName(
        text,
        context.sourceFile.fileName,
        compilerOptions,
        ts.sys
      )

      return Option.fromNullishOr(resolution.resolvedModule)
    }),
    Option.flatMap(pipeOf5)
  )
}
