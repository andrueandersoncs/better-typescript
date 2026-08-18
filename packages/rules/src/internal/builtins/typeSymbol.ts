import { Option, pipe } from "effect"
import type * as ts from "typescript"

export const typeSymbol = (type: ts.Type) => {
  const symbolFromType = (candidate: ts.Type) => pipe(candidate.getSymbol(), Option.fromNullishOr)

  return pipe(
    Option.fromNullishOr(type.aliasSymbol),
    Option.orElse(() => symbolFromType(type))
  )
}
