import * as path from "node:path"
import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-function-keyword"

type FunctionKeywordNode = ts.FunctionDeclaration | ts.FunctionExpression
type FunctionDeclarationWithBody = ts.FunctionDeclaration & {
  readonly body: NonNullable<ts.FunctionDeclaration["body"]>
}

export const noFunctionKeyword: Rule = {
  id: ruleId,
  description: "Disallow non-generator function declarations in favor of const arrow functions.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(isFunctionKeywordNode),
        Stream.filter((node) => isDisallowedFunctionKeyword(context, node)),
        Stream.map((node) => createMatch(context, node)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const isFunctionKeywordNode = (node: ts.Node): node is FunctionKeywordNode =>
  ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)

const isDisallowedFunctionKeyword = (
  context: RuleContext,
  node: FunctionKeywordNode
): boolean => {
  const isNotGenerator = !isGeneratorFunction(node)
  const isDisallowedKind =
    ts.isFunctionExpression(node) || isDisallowedFunctionDeclaration(context, node)

  return isNotGenerator && isDisallowedKind
}

const isDisallowedFunctionDeclaration = (
  context: RuleContext,
  node: FunctionKeywordNode
): boolean => {
  const declaration = functionDeclarationWithBody(node)
  let isDisallowed = false

  if (declaration !== undefined) {
    isDisallowed = !hasOverloadSignature(context, declaration)
  }

  return isDisallowed
}

const isGeneratorFunction = (node: FunctionKeywordNode): boolean =>
  node.asteriskToken !== undefined

const hasFunctionBody = (
  declaration: ts.FunctionDeclaration
): declaration is FunctionDeclarationWithBody => declaration.body !== undefined

const functionDeclarationWithBody = (
  node: FunctionKeywordNode
): FunctionDeclarationWithBody | undefined => {
  if (!ts.isFunctionDeclaration(node)) {
    return undefined
  }

  if (!hasFunctionBody(node)) {
    return undefined
  }

  return node
}

const hasOverloadSignature = (
  context: RuleContext,
  declaration: FunctionDeclarationWithBody
): boolean => {
  let symbol: ts.Symbol | undefined

  if (declaration.name !== undefined) {
    symbol = context.checker.getSymbolAtLocation(declaration.name)
  }

  const declarations = symbol?.declarations?.filter(ts.isFunctionDeclaration) ?? []

  return declarations.some((candidate) => isOverloadCandidate(candidate, declaration))
}

const isOverloadCandidate = (
  candidate: ts.FunctionDeclaration,
  implementation: FunctionDeclarationWithBody
): boolean => {
  const isImplementation = candidate === implementation
  let isOverload = false

  if (!isImplementation) {
    isOverload = candidate.body === undefined
  }

  return isOverload
}

const createMatch = (context: RuleContext, node: FunctionKeywordNode): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = functionKeywordStart(sourceFile, node)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: "Avoid using the function keyword.",
    hint:
      "Declare this function as a const using fat-arrow syntax instead. Keep function " +
      "declarations only when overload signatures are required, and keep function* when " +
      "generator semantics are required."
  }
}

const functionKeywordStart = (sourceFile: ts.SourceFile, node: FunctionKeywordNode): number => {
  const functionKeyword = node
    .getChildren(sourceFile)
    .find((child) => child.kind === ts.SyntaxKind.FunctionKeyword)

  return functionKeyword?.getStart(sourceFile) ?? node.getStart(sourceFile)
}

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  if (relative.length === 0) {
    return fileName
  }

  return relative
}
