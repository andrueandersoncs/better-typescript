import { Array, Option, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { isEffectInterfaceSymbol } from "../../support/isEffectInterfaceSymbol.js"

const effectSymbolOfType = flow((type: ts.Type) => type.getSymbol(), Option.fromNullishOr)

const effectAliasSymbolOfType = flow(
  Struct.get<ts.Type, "aliasSymbol">("aliasSymbol"),
  Option.fromNullishOr
)

export const typeIsEffect = (type: ts.Type) => {
  const direct = pipe(effectSymbolOfType(type), Option.exists(isEffectInterfaceSymbol))
  const alias = pipe(effectAliasSymbolOfType(type), Option.exists(isEffectInterfaceSymbol))
  const checks = Array.make(direct, alias)

  return Array.some(checks, Boolean)
}
