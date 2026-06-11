import * as path from "node:path"
import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { functionInitializer } from "./tsNode.js"
import type { FunctionInitializer } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-effect-fn"

const hasParameters = (initializer: FunctionInitializer): boolean =>
  initializer.parameters.length > 0

const effectModuleFileNames: ReadonlySet<string> = new Set(["Effect.ts", "Effect.d.ts"])

const isEffectModuleDeclaration = (declaration: ts.Declaration): boolean => {
  const declarationFileName = declaration.getSourceFile().fileName
  const baseFileName = path.basename(declarationFileName)

  return effectModuleFileNames.has(baseFileName)
}

const isEffectInterfaceSymbol = (symbol: ts.Symbol): boolean => {
  const isNamedEffect = symbol.name === "Effect"
  const hasEffectModuleDeclaration = (symbol.declarations ?? []).some(isEffectModuleDeclaration)

  return isNamedEffect && hasEffectModuleDeclaration
}

const isEffectType = (type: ts.Type): boolean => {
  const typeSymbol = type.getSymbol()
  const symbol = Option.fromNullable(typeSymbol)

  return Option.exists(symbol, isEffectInterfaceSymbol)
}

const signatureReturnsEffect =
  (context: RuleContext) =>
  (signature: ts.Signature): boolean => {
    const returnType = context.checker.getReturnTypeOfSignature(signature)

    return isEffectType(returnType)
  }

const returnsEffect =
  (context: RuleContext) =>
  (initializer: FunctionInitializer): boolean => {
    const declaredSignature = context.checker.getSignatureFromDeclaration(initializer)
    const signature = Option.fromNullable(declaredSignature)

    return Option.exists(signature, signatureReturnsEffect(context))
  }

const effectFnRuleMatch =
  (context: RuleContext) =>
  (declaration: ts.VariableDeclaration): RuleMatch => {
    const functionName = declaration.name.getText(context.sourceFile)

    return createRuleMatch(context, {
      ruleId,
      node: declaration.name,
      message: `Avoid declaring ${functionName} as a plain function that returns an Effect.`,
      hint:
        `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
        "{ ... }) so every call runs inside a traced span. Effect.fn accepts a generator body " +
        "or a function returning an Effect."
    })
  }

const effectFnMatches = (
  declaration: ts.VariableDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  functionInitializer(declaration).pipe(
    Option.filter(hasParameters),
    Option.filter(returnsEffect(context)),
    Option.as(declaration),
    Option.map(effectFnRuleMatch(context)),
    Option.toArray
  )

const check = onNode([ts.SyntaxKind.VariableDeclaration], ts.isVariableDeclaration, effectFnMatches)

export const preferEffectFn = new Rule({
  id: ruleId,
  description: "Require Effect.fn for functions with parameters that return an Effect.",
  check
})
