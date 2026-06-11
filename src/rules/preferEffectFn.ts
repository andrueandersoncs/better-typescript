import * as path from "node:path"
import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { functionInitializer } from "./tsNode.js"
import type { FunctionInitializer } from "./tsNode.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-effect-fn"

interface DeclaredFunction {
  readonly declaration: ts.VariableDeclaration
  readonly initializer: FunctionInitializer
}

export const preferEffectFn: Rule = {
  id: ruleId,
  description: "Require Effect.fn for functions with parameters that return an Effect.",
  check: onNode(
    [ts.SyntaxKind.VariableDeclaration],
    ts.isVariableDeclaration,
    (declaration, context) =>
      Option.match(
        effectFnCandidate(declaration).pipe(
          Option.filter(hasParameters),
          Option.filter((candidate) => returnsEffect(context, candidate))
        ),
        {
          onNone: () => [],
          onSome: (candidate) => [effectFnMatch(context, candidate)]
        }
      )
  )
}

const effectFnCandidate = (
  declaration: ts.VariableDeclaration
): Option.Option<DeclaredFunction> =>
  Option.map(functionInitializer(declaration), (initializer) => ({ declaration, initializer }))

const hasParameters = (candidate: DeclaredFunction): boolean =>
  candidate.initializer.parameters.length > 0

const returnsEffect = (context: RuleContext, candidate: DeclaredFunction): boolean => {
  const signature = Option.fromNullable(
    context.checker.getSignatureFromDeclaration(candidate.initializer)
  )

  return Option.match(signature, {
    onNone: () => false,
    onSome: (signature) => isEffectType(context.checker.getReturnTypeOfSignature(signature))
  })
}

const isEffectType = (type: ts.Type): boolean =>
  Option.match(Option.fromNullable(type.getSymbol()), {
    onNone: () => false,
    onSome: isEffectInterfaceSymbol
  })

const isEffectInterfaceSymbol = (symbol: ts.Symbol): boolean => {
  const isNamedEffect = symbol.name === "Effect"
  const hasEffectModuleDeclaration = (symbol.declarations ?? []).some(isEffectModuleDeclaration)

  return isNamedEffect && hasEffectModuleDeclaration
}

const effectModuleFileNames: ReadonlySet<string> = new Set(["Effect.ts", "Effect.d.ts"])

const isEffectModuleDeclaration = (declaration: ts.Declaration): boolean =>
  effectModuleFileNames.has(path.basename(declaration.getSourceFile().fileName))

const effectFnMatch = (context: RuleContext, candidate: DeclaredFunction): RuleMatch => {
  const functionName = candidate.declaration.name.getText(context.sourceFile)

  return createRuleMatch(context, {
    ruleId,
    node: candidate.declaration.name,
    message: `Avoid declaring ${functionName} as a plain function that returns an Effect.`,
    hint:
      `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
      "{ ... }) so every call runs inside a traced span. Effect.fn accepts a generator body " +
      "or a function returning an Effect."
  })
}
