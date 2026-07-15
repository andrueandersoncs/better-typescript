import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { isFirstPartySymbol } from "./support/tsNode.js"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

const weakMapIdentifier = (node: ts.Node): node is ts.Identifier =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(node),
    Option.exists((identifier) => identifier.text === "WeakMap")
  )

const message = "Avoid WeakMap because it keeps mutable state outside Effect."

const hint =
  "Store immutable state in an Effect Ref instead. Use SynchronizedRef when updates are " +
  "effectful, or SubscriptionRef when consumers need a stream of changes. Create the " +
  "reference inside an Effect or Layer instead of retaining a module-level WeakMap."

const weakMapMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = detection(context)

  const matches = (identifier: ts.Identifier): ReadonlyArray<Detection> =>
    pipe(
      checker.getSymbolAtLocation(identifier),
      Option.fromNullable,
      Option.filter((symbol) => !isFirstPartySymbol(symbol)),
      Option.map(() =>
        match({
          node: identifier,
          message,
          hint
        })
      ),
      Option.toArray
    )

  return matches
}

const identifierKinds = Array.of(ts.SyntaxKind.Identifier)

const check = nodeCheck(identifierKinds)(weakMapIdentifier)(weakMapMatches)

export const noWeakMap: Check = check

export const noWeakMapExamples: NonEmptyRefactorExamples = fixtureRefactorExamples("no-weak-map")
