import { Array, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { isCompositionRoot } from "./support/compositionRoot.js"
import {
  functionInitializer,
  resolvedSymbolAt,
  singleStatementReturnExpression,
  unwrapExpression,
  type FunctionDefinition
} from "./support/tsNode.js"
import { symbolDeclaredInEffectPackage } from "./support/tsSignature.js"

// Methods stay excluded because typed adapters are valid runtime boundaries.
type EffectfulFunctionDeclaration = ts.VariableDeclaration | ts.FunctionDeclaration

const functionResult = (definition: FunctionDefinition) =>
  pipe(
    Option.fromNullishOr(definition.body),
    Option.flatMap((body) =>
      ts.isBlock(body) ? singleStatementReturnExpression(body) : Option.some(body)
    )
  )

const calleeName = (expression: ts.LeftHandSideExpression): Option.Option<ts.Node> => {
  const unwrapped = unwrapExpression(expression)

  if (ts.isIdentifier(unwrapped)) {
    return Option.some(unwrapped)
  }

  return pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
    Option.map(Struct.get("name"))
  )
}

const functionDefinition = (
  declaration: EffectfulFunctionDeclaration
): Option.Option<FunctionDefinition> =>
  ts.isVariableDeclaration(declaration)
    ? functionInitializer(declaration)
    : Option.some(declaration)

const isEffectRunSyncCall =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): boolean =>
    pipe(
      unwrapExpression(expression),
      Option.liftPredicate(ts.isCallExpression),
      Option.flatMap((call) => calleeName(call.expression)),
      Option.flatMap(resolvedSymbolAt(checker)),
      Option.exists((symbol) => {
        const nameMatches = symbol.name === "runSync"
        const fromEffect = symbolDeclaredInEffectPackage(symbol)
        const conditions = Array.make(nameMatches, fromEffect)

        return Array.every(conditions, Boolean)
      })
    )

const effectfulFunctionMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const runSyncResult = isEffectRunSyncCall(context.checker)
  const fromCompositionRoot = isCompositionRoot(context.sourceFile)

  const matches = (declaration: EffectfulFunctionDeclaration): ReadonlyArray<Detection> => {
    const declaredType = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(declaration),
      Option.flatMap((variable) => Option.fromNullishOr(variable.type))
    )

    const hasExplicitFunctionContract = Option.isSome(declaredType)
    const ignoreConditions = Array.make(fromCompositionRoot, hasExplicitFunctionContract)

    if (Array.some(ignoreConditions, Boolean)) {
      return Array.empty()
    }

    const name = pipe(Option.fromNullishOr(declaration.name), Option.filter(ts.isIdentifier))
    const definition = functionDefinition(declaration)

    const candidate = Option.all({
      definition,
      name
    })

    return pipe(
      candidate,
      Option.flatMap(({ definition, name }) =>
        pipe(
          functionResult(definition),
          Option.filter(runSyncResult),
          Option.map(() => {
            const functionName = name.getText(context.sourceFile)

            return match({
              node: name,
              message: `Avoid synchronously unwrapping an Effect in ${functionName}.`,
              hint:
                `Return the Effect from ${functionName} and compose callers with yield* or ` +
                "Effect.flatMap. Reserve Effect.runSync for the application runtime boundary."
            })
          })
        )
      ),
      Option.toArray
    )
  }

  return matches
}

const functionDeclarationKinds = Array.make(
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.FunctionDeclaration
)

const isEffectfulFunctionDeclaration = (node: ts.Node): node is EffectfulFunctionDeclaration => {
  const isVariable = ts.isVariableDeclaration(node)
  const isFunction = ts.isFunctionDeclaration(node)
  const declarationKinds = Array.make(isVariable, isFunction)

  return Array.some(declarationKinds, Boolean)
}

export const preferEffectfulFunction = makeCheck(
  "prefer-effectful-function",
  functionDeclarationKinds,
  isEffectfulFunctionDeclaration,
  effectfulFunctionMatches
)
