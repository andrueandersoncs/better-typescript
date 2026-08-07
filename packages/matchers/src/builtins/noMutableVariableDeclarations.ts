import { Array, HashMap, Option, Schema, Tuple, pipe } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"
import {
  MutableVariableDeclarationKind,
  type MutableVariableDeclarationKind as MutableVariableDeclarationKindT
} from "./mutableVariableDeclarationKind.js"

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
  const matchDeclarationList = (declarationList: ts.VariableDeclarationList) => {
    const matchWithKind = (kind: MutableVariableDeclarationKindT) => {
      const fact = NoMutableVariableDeclarationsFact.make({ kind })
      return makeNodeMatch(declarationList, fact)
    }

    return pipe(
      declarationList.getFirstToken(context.sourceFile),
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
