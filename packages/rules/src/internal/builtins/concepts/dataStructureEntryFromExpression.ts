import { Function, HashMap, Match, Option, pipe } from "effect"
import { strictEqual } from "../../equivalence.js"
import * as ts from "typescript"
import { referenceKey } from "../../support/referenceKey.js"
import type { ReferenceKey } from "../../support/referenceKeyType.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import type { DataStructureEntry } from "./conceptScanners.js"
import { modelFromResolvedType } from "./modelFromResolvedType.js"
import { symbolAt } from "./symbolAt.js"

const noneDataStructureEntry: Option.Option<DataStructureEntry> = Option.none()

const modelFromObjectLiteral =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (literal: ts.ObjectLiteralExpression): Option.Option<DataStructureEntry> =>
    pipe(
      checker.getContextualType(literal),
      Option.fromNullishOr,
      Option.flatMap(modelFromResolvedType(checker)(dataBySymbol))
    )

const modelFromExpression =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (expression: ts.Expression): Option.Option<DataStructureEntry> =>
    pipe(
      unwrapCallee(expression),
      symbolAt(checker),
      Option.flatMap((symbol) => {
        const symbolKey = referenceKey(symbol)

        return HashMap.get(dataBySymbol, symbolKey)
      })
    )

const modelFromMakeCall =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (expression: ts.CallExpression): Option.Option<DataStructureEntry> => {
    const makeTargetExpression = (access: ts.PropertyAccessExpression) =>
      unwrapCallee(access.expression)

    const accessNameIsMake = (access: ts.PropertyAccessExpression) =>
      strictEqual("make")(access.name.text)

    return pipe(
      unwrapCallee(expression.expression),
      Option.liftPredicate(ts.isPropertyAccessExpression),
      Option.filter(accessNameIsMake),
      Option.map(makeTargetExpression),
      Option.flatMap(symbolAt(checker)),
      Option.flatMap((symbol) => {
        const symbolKey = referenceKey(symbol)

        return HashMap.get(dataBySymbol, symbolKey)
      })
    )
  }

export const dataStructureEntryFromExpression =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (expression: ts.Expression) => {
    const modelFromConstructedExpression = (constructed: ts.NewExpression) =>
      modelFromExpression(checker)(dataBySymbol)(constructed.expression)

    return pipe(
      unwrapTransparentExpression(expression),
      Match.value,
      Match.when(ts.isObjectLiteralExpression, modelFromObjectLiteral(checker)(dataBySymbol)),
      Match.when(ts.isNewExpression, modelFromConstructedExpression),
      Match.when(ts.isCallExpression, modelFromMakeCall(checker)(dataBySymbol)),
      Match.orElse(Function.constant(noneDataStructureEntry))
    )
  }
