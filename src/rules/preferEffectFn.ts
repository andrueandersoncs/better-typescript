import * as path from "node:path"
import { Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import {
  functionInitializer,
  returnedExpression,
  unwrapExpression
} from "./tsNode.js"
import { symbolDeclaredInEffectPackage } from "./tsSignature.js"
import type { FunctionInitializer } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-effect-fn"

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
  const hasEffectModuleDeclaration = (symbol.declarations ?? []).some(
    isEffectModuleDeclaration
  )

  return isNamedEffect && hasEffectModuleDeclaration
}

const signatureReturnsEffect =
  (context: RuleContext) =>
  (signature: ts.Signature): boolean => {
    const returnType = context.checker.getReturnTypeOfSignature(signature)

    const typeSymbol = returnType.getSymbol()
    const symbol = Option.fromNullable(typeSymbol)

    return Option.exists(symbol, isEffectInterfaceSymbol)
  }

const returnsEffect =
  (context: RuleContext) =>
  (initializer: FunctionInitializer): boolean => {
    const declaredSignature =
      context.checker.getSignatureFromDeclaration(initializer)
    const signature = Option.fromNullable(declaredSignature)

    return Option.exists(signature, signatureReturnsEffect(context))
  }

const singleBlockStatement = (block: ts.Block): Option.Option<ts.Statement> =>
  block.statements.length === 1
    ? Option.fromNullable(block.statements[0])
    : Option.none()

const isGenPropertyName = (access: ts.PropertyAccessExpression): boolean =>
  access.name.text === "gen"

const isEffectGenAccess =
  (checker: ts.TypeChecker) =>
  (access: ts.PropertyAccessExpression): boolean => {
    const symbol = checker.getSymbolAtLocation(access.name)

    return pipe(
      Option.fromNullable(symbol),
      Option.exists(symbolDeclaredInEffectPackage)
    )
  }

// Only Effect.gen wrappers are rewritable as Effect.fn without changing what the function builds; plain combinator bodies (Effect.sync, pipe chains) stay as-is.
const bodyIsEffectGenCall =
  (checker: ts.TypeChecker) =>
  (initializer: FunctionInitializer): boolean => {
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
      Option.exists(isEffectGenAccess(checker))
    )
  }

const effectFnRuleMatch =
  (context: RuleContext) =>
  (declaration: ts.VariableDeclaration): RuleMatch => {
    const functionName = declaration.name.getText(context.sourceFile)

    return createRuleMatch(context)({
      ruleId,
      node: declaration.name,
      message: `Avoid wrapping the body of ${functionName} in Effect.gen; use Effect.fn.`,
      hint:
        `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
        "{ ... }): Effect.fn subsumes the Effect.gen wrapper and runs every call inside a " +
        "traced span."
    })
  }

const effectFnMatches =
  (context: RuleContext) =>
  (declaration: ts.VariableDeclaration): ReadonlyArray<RuleMatch> =>
    pipe(
      functionInitializer(declaration),
      Option.filter(hasParameters),
      Option.filter(returnsEffect(context)),
      Option.filter(bodyIsEffectGenCall(context.checker)),
      Option.as(declaration),
      Option.map(effectFnRuleMatch(context)),
      Option.toArray
    )

const check = onNode([ts.SyntaxKind.VariableDeclaration])(
  ts.isVariableDeclaration
)(effectFnMatches)

const badExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `import { Effect } from "effect"

declare const fetchUser: (id: string) => Effect.Effect<{ readonly id: string }>

export const getUser = (id: string) =>
  Effect.gen(function* () {
    return yield* fetchUser(id)
  })`
})

const goodExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `import { Effect } from "effect"

declare const fetchUser: (id: string) => Effect.Effect<{ readonly id: string }>

export const getUser = Effect.fn("getUser")(function* (id: string) {
  return yield* fetchUser(id)
})`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferEffectFn = new Rule({
  id: ruleId,
  description:
    "Require Effect.fn instead of wrapping a parameterized function's body in Effect.gen.",
  example,
  check
})
