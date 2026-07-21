import { Array, Function, Option, pipe, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"

// NoFunctionKeywordFact is empty payload because guidance and matchers share identity.
export const NoFunctionKeywordFact = Schema.Struct({})

export interface NoFunctionKeywordFact extends Schema.Schema.Type<typeof NoFunctionKeywordFact> {}

// emptyNoFunctionKeywordFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoFunctionKeywordFact = NoFunctionKeywordFact.make({})

// FunctionKeywordNode is a local syntax union because matchers need one narrowed node shape.
export type FunctionKeywordNode = ts.FunctionDeclaration | ts.FunctionExpression

const isFunctionKeywordNode = (node: ts.Node): node is FunctionKeywordNode =>
  ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)

const isFunctionKeywordToken = flow(
  Struct.get<ts.Node, "kind">("kind"),
  strictEqual(ts.SyntaxKind.FunctionKeyword)
)

const functionKeywordMatches = (context: MatchContext) => {
  const sourceFile = context.sourceFile
  const checker = context.checker

  const matchFunctionKeywordNode = (node: FunctionKeywordNode) => {
    const asteriskToken = Option.fromNullishOr(node.asteriskToken)
    const isNotGenerator = !Option.isSome(asteriskToken)

    const declarationWithBody = ts.isFunctionDeclaration(node)
      ? pipe(Option.fromNullishOr(node.body), Option.as(node))
      : Option.none()

    const isDisallowedKind =
      ts.isFunctionExpression(node) ||
      Option.exists(declarationWithBody, (declaration) => {
        const declarations = Option.gen(function* () {
          const name = yield* Option.fromNullishOr(declaration.name)
          const nameSymbol = checker.getSymbolAtLocation(name)
          const symbol = yield* Option.fromNullishOr(nameSymbol)
          const decls = yield* Option.fromNullishOr(symbol.declarations)

          return Array.filter(decls, ts.isFunctionDeclaration)
        })

        const isOverloadSibling = (candidate: ts.FunctionDeclaration) => {
          const isImplementation = strictEqual(declaration)(candidate)
          const body = Option.fromNullishOr(candidate.body)
          const hasNoBody = Option.isNone(body)
          const overloadSiblingConditions = Array.make(!isImplementation, hasNoBody)

          return Array.every(overloadSiblingConditions, Boolean)
        }

        const hasOverloadSibling = (decls: ReadonlyArray<ts.FunctionDeclaration>) =>
          Array.some(decls, isOverloadSibling)

        return !Option.exists(declarations, hasOverloadSibling)
      })

    const shouldFlag = isNotGenerator && isDisallowedKind

    if (!shouldFlag) {
      return Array.empty()
    }

    const children = node.getChildren(sourceFile)

    const keywordToken = pipe(
      Array.findFirst(children, isFunctionKeywordToken),
      Option.getOrElse(Function.constant(node))
    )

    const match = nodeMatch(keywordToken, emptyNoFunctionKeywordFact)

    return Array.of(match)
  }

  return matchFunctionKeywordNode
}

const functionKeywordKinds = Array.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression
)

export const noFunctionKeywordMatcher =
  nodeMatcher(functionKeywordKinds)(isFunctionKeywordNode)(functionKeywordMatches)
