import * as path from "node:path"
import { Array, Function, HashSet, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import { functionInitializer, hasParameters, unwrapExpression } from "./support/tsNode.js"
import { symbolDeclaredInEffectPackage } from "./support/tsSignature.js"
import { defineCheck } from "../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { detection } from "@better-typescript/core/engine/check"

const effectModuleFileNames = HashSet.make("Effect.ts", "Effect.d.ts")

const isEffectModuleDeclaration = (declaration: ts.Declaration): boolean => {
  const declarationFileName = declaration.getSourceFile().fileName
  const baseFileName = path.basename(declarationFileName)

  return HashSet.has(effectModuleFileNames, baseFileName)
}

const isEffectInterfaceSymbol = (symbol: ts.Symbol): boolean => {
  const isNamedEffect = symbol.name === "Effect"
  const declarations = symbol.declarations ?? Array.empty()
  const hasEffectModuleDeclaration = Array.some(declarations, isEffectModuleDeclaration)

  return isNamedEffect && hasEffectModuleDeclaration
}

const singleBlockStatement = (block: ts.Block): Option.Option<ts.Statement> =>
  block.statements.length === 1 ? Option.fromNullishOr(block.statements[0]) : Option.none()

const isGenPropertyName = (access: ts.PropertyAccessExpression): boolean =>
  access.name.text === "gen"

const returnedExpression = (
  initializer: ts.ArrowFunction | ts.FunctionExpression
): Option.Option<ts.Expression> => {
  const body = initializer.body

  const blockResult = pipe(
    Option.liftPredicate(ts.isBlock)(body),
    Option.flatMap(singleBlockStatement),
    Option.filter(ts.isReturnStatement),
    Option.flatMap((statement) => Option.fromNullishOr(statement.expression))
  )

  const conciseResult = ts.isBlock(body) ? Option.none<ts.Expression>() : Option.some(body)

  return Option.orElse(blockResult, Function.constant(conciseResult))
}

const isEffectGenAccess =
  (checker: ts.TypeChecker) =>
  (access: ts.PropertyAccessExpression): boolean =>
    isGenPropertyName(access) &&
    pipe(
      checker.getSymbolAtLocation(access.name),
      Option.fromNullishOr,
      Option.exists(symbolDeclaredInEffectPackage)
    )

const effectGenCall =
  (checker: ts.TypeChecker) =>
  (initializer: ts.ArrowFunction | ts.FunctionExpression): Option.Option<ts.CallExpression> =>
    pipe(
      returnedExpression(initializer),
      Option.map(unwrapExpression),
      Option.filter(ts.isCallExpression),
      Option.filter((call) =>
        pipe(
          Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression),
          Option.exists(isEffectGenAccess(checker))
        )
      )
    )

const selfBindingLiteral = (call: ts.CallExpression): Option.Option<ts.ObjectLiteralExpression> =>
  pipe(
    Option.fromNullishOr(call.arguments[0]),
    Option.filter(ts.isObjectLiteralExpression),
    Option.filter((literal) =>
      Array.some(literal.properties, (property) =>
        pipe(
          Match.value(property),
          Match.when(
            ts.isShorthandPropertyAssignment,
            (shorthand) => shorthand.name.text === "self"
          ),
          Match.when(ts.isPropertyAssignment, (assignment) =>
            pipe(
              Match.value(assignment.name),
              Match.when(ts.isIdentifier, (name) => name.text === "self"),
              Match.when(ts.isStringLiteralLike, (name) => name.text === "self"),
              Match.orElse(Function.constFalse)
            )
          ),
          Match.orElse(Function.constFalse)
        )
      )
    )
  )

const generatorThisTypeText =
  (sourceFile: ts.SourceFile) =>
  (call: ts.CallExpression): string =>
    pipe(
      Array.findFirst(call.arguments, ts.isFunctionExpression),
      Option.flatMap((generator) =>
        Array.findFirst(generator.parameters, (parameter) =>
          pipe(
            Option.liftPredicate(ts.isIdentifier)(parameter.name),
            Option.exists((name) => name.text === "this")
          )
        )
      ),
      Option.flatMap((parameter) => Option.fromNullishOr(parameter.type)),
      Option.map((typeNode) => typeNode.getText(sourceFile)),
      Option.getOrElse(Function.constant("..."))
    )

const ordinaryHint = (functionName: string): string =>
  `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
  "{ ... }): Effect.fn subsumes the Effect.gen wrapper and runs every call inside a " +
  "traced span."

const selfBoundHint =
  (sourceFile: ts.SourceFile) =>
  (functionName: string, call: ts.CallExpression): string => {
    const selfBinding = pipe(
      selfBindingLiteral(call),
      Option.map((literal) => literal.getText(sourceFile)),
      Option.getOrElse(Function.constant("{ self: this }"))
    )

    const thisType = generatorThisTypeText(sourceFile)(call)

    return (
      `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(${selfBinding}, ` +
      `function*(this: ${thisType}, ...) { ... }): Effect.fn subsumes the Effect.gen wrapper ` +
      "and runs every call inside a traced span."
    )
  }

const rewriteHint =
  (sourceFile: ts.SourceFile) =>
  (functionName: string, call: ts.CallExpression): string =>
    pipe(
      selfBindingLiteral(call),
      Option.match({
        onNone: () => ordinaryHint(functionName),
        onSome: () => selfBoundHint(sourceFile)(functionName, call)
      })
    )

const effectFnMatches = (context: CheckContext) => {
  const checker = context.checker
  const sourceFile = context.sourceFile
  const match = detection(context)
  const genCall = effectGenCall(checker)
  const hintFor = rewriteHint(sourceFile)

  const matches = (declaration: ts.VariableDeclaration): ReadonlyArray<Detection> =>
    pipe(
      functionInitializer(declaration),
      Option.filter(hasParameters),
      Option.filter((initializer) => {
        const declaredSignature = checker.getSignatureFromDeclaration(initializer)
        const signature = Option.fromNullishOr(declaredSignature)

        return Option.exists(signature, (signature) => {
          const returnType = checker.getReturnTypeOfSignature(signature)
          const typeSymbol = returnType.getSymbol()
          const symbol = Option.fromNullishOr(typeSymbol)

          return Option.exists(symbol, isEffectInterfaceSymbol)
        })
      }),
      // Rewrite only Effect.gen wrappers because Effect.fn changes what plain combinator bodies build.
      Option.flatMap(genCall),
      Option.map((call) => {
        const functionName = declaration.name.getText(sourceFile)
        const hint = hintFor(functionName, call)

        return match({
          node: declaration.name,
          message: `Avoid wrapping the body of ${functionName} in Effect.gen; use Effect.fn.`,
          hint
        })
      }),
      Option.toArray
    )

  return matches
}

const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)

export const preferEffectFn = defineCheck(
  "prefer-effect-fn",
  variableDeclarationKinds,
  ts.isVariableDeclaration,
  effectFnMatches
)
