import { Tuple, Array, HashMap, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"

const mutableVariableDeclarationKinds = Array.make<["let", "var"]>("let", "var")

// MutableVariableDeclarationKind classifies let/var because declaration advice differs.
export const MutableVariableDeclarationKind = Schema.Literals(mutableVariableDeclarationKinds)

export type MutableVariableDeclarationKind = typeof MutableVariableDeclarationKind.Type

// NoMutableVariableDeclarationsFact names the keyword because guidance distinguishes let and var.
export const NoMutableVariableDeclarationsFact = Schema.Struct({
  kind: MutableVariableDeclarationKind
})

export interface NoMutableVariableDeclarationsFact extends Schema.Schema.Type<
  typeof NoMutableVariableDeclarationsFact
> {}

const nested6 = Tuple.make(ts.SyntaxKind.LetKeyword, "let" as const)

const nested7 = Tuple.make(ts.SyntaxKind.VarKeyword, "var" as const)

const mutableKeywordKinds = HashMap.make(nested6, nested7)

const tokenMutableKind = (firstToken: ts.Node) => HashMap.get(mutableKeywordKinds, firstToken.kind)

const variableDeclarationListKinds = Array.of(ts.SyntaxKind.VariableDeclarationList)

const mutableVariableDeclarationsMatches = (context: MatchContext) => {
  const sourceFile = context.sourceFile

  const matchDeclarationList = (declarationList: ts.VariableDeclarationList) => {
    const matchWithKind = (kind: MutableVariableDeclarationKind) => {
      const fact = NoMutableVariableDeclarationsFact.make({ kind })
      return nodeMatch(declarationList, fact)
    }

    return pipe(
      declarationList.getFirstToken(sourceFile),
      Option.fromNullishOr,
      Option.flatMap(tokenMutableKind),
      Option.map(matchWithKind),
      Option.toArray
    )
  }

  return matchDeclarationList
}

export const noMutableVariableDeclarationsMatcher = nodeMatcher(variableDeclarationListKinds)(
  ts.isVariableDeclarationList
)(mutableVariableDeclarationsMatches)
