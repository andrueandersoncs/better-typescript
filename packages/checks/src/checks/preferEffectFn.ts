import * as path from "node:path"
import { Array, Function, HashSet, Option, pipe, Struct } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import {
  functionInitializer,
  returnedExpression,
  unwrapExpression
} from "./support/tsNode.js"
import { symbolDeclaredInEffectPackage } from "./support/tsSignature.js"
import type { FunctionInitializer } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

const hasParameters = (initializer: FunctionInitializer): boolean =>
  initializer.parameters.length > 0

const effectModuleFileNames = HashSet.make("Effect.ts", "Effect.d.ts")

const isEffectModuleDeclaration = (declaration: ts.Declaration): boolean => {
  const declarationFileName = declaration.getSourceFile().fileName
  const baseFileName = path.basename(declarationFileName)

  return HashSet.has(effectModuleFileNames, baseFileName)
}

const isEffectInterfaceSymbol = (symbol: ts.Symbol): boolean => {
  const isNamedEffect = symbol.name === "Effect"
  const declarations = symbol.declarations ?? Array.empty()

  const hasEffectModuleDeclaration = Array.some(
    declarations,
    isEffectModuleDeclaration
  )

  return isNamedEffect && hasEffectModuleDeclaration
}

const singleBlockStatement = (block: ts.Block): Option.Option<ts.Statement> =>
  block.statements.length === 1
    ? Option.fromNullable(block.statements[0])
    : Option.none()

const isGenPropertyName = (access: ts.PropertyAccessExpression): boolean =>
  access.name.text === "gen"

const effectFnMatches = (context: CheckContext) => {
  const checker = context.checker
  const sourceFile = context.sourceFile
  const match = detection(context)

  const matches = (
    declaration: ts.VariableDeclaration
  ): ReadonlyArray<Detection> =>
    pipe(
      functionInitializer(declaration),
      Option.filter(hasParameters),
      Option.filter((initializer) => {
        const declaredSignature =
          checker.getSignatureFromDeclaration(initializer)

        const signature = Option.fromNullable(declaredSignature)

        return Option.exists(signature, (signature) => {
          const returnType = checker.getReturnTypeOfSignature(signature)

          const typeSymbol = returnType.getSymbol()
          const symbol = Option.fromNullable(typeSymbol)

          return Option.exists(symbol, isEffectInterfaceSymbol)
        })
      }),
      // Rewrite only Effect.gen wrappers because Effect.fn would change what plain combinator bodies build.
      Option.filter((initializer) => {
        const body = initializer.body

        const blockResult = pipe(
          Option.liftPredicate(ts.isBlock)(body),
          Option.flatMap(singleBlockStatement),
          Option.filter(ts.isReturnStatement),
          Option.flatMap(returnedExpression)
        )

        const conciseResult = ts.isBlock(body)
          ? Option.none<ts.Expression>()
          : Option.some(body)

        const resultExpression = Option.orElse(
          blockResult,
          Function.constant(conciseResult)
        )

        const unwrapped = Option.map(resultExpression, unwrapExpression)

        return pipe(
          unwrapped,
          Option.filter(ts.isCallExpression),
          Option.map(Struct.get("expression")),
          Option.filter(ts.isPropertyAccessExpression),
          Option.filter(isGenPropertyName),
          Option.exists((access) =>
            pipe(
              checker.getSymbolAtLocation(access.name),
              Option.fromNullable,
              Option.exists(symbolDeclaredInEffectPackage)
            )
          )
        )
      }),
      Option.as(declaration),
      Option.map((declaration) => {
        const functionName = declaration.name.getText(sourceFile)

        return match({
          node: declaration.name,
          message: `Avoid wrapping the body of ${functionName} in Effect.gen; use Effect.fn.`,
          hint:
            `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
            "{ ... }): Effect.fn subsumes the Effect.gen wrapper and runs every call inside a " +
            "traced span."
        })
      }),
      Option.toArray
    )

  return matches
}

const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)
const check = nodeCheck(variableDeclarationKinds)(ts.isVariableDeclaration)(effectFnMatches)

export const preferEffectFn: Check = check

export const preferEffectFnExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-fn")
