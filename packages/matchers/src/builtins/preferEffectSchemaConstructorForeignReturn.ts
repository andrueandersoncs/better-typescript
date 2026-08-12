import { Function, Option, Struct } from "effect"
import * as ts from "typescript"
import type { MatchContext } from "../matcher/matchContext.js"
import { isFirstPartySymbol } from "../support/isFirstPartySymbol.js"
import { typeSymbol } from "./typeSymbol.js"

const findFunctionAncestor = (node: ts.Node) => ts.findAncestor(node, ts.isFunctionLike)

const functionReturnType = Function.flow(
  findFunctionAncestor,
  Option.fromNullishOr,
  Option.map(Struct.get<ts.SignatureDeclaration, "type">("type")),
  Option.flatMap(Option.fromNullishOr)
)

const isForeignSymbol = (symbol: ts.Symbol) => !isFirstPartySymbol(symbol)

export const hasForeignReturnContract = (context: MatchContext) =>
  Function.flow(
    functionReturnType,
    Option.map(context.checker.getTypeAtLocation.bind(context.checker)),
    Option.flatMap(typeSymbol),
    Option.exists(isForeignSymbol)
  )
