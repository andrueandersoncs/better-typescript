import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { namedNodeReportTarget } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-class-method-implementations"

const methodDeclarationKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.MethodDeclaration
]

const isMethodDeclaration = (node: ts.Node): node is ts.MethodDeclaration =>
  ts.isMethodDeclaration(node)

const hasBody = (node: ts.MethodDeclaration): boolean => {
  const body = Option.fromNullable(node.body)

  return Option.isSome(body)
}

const isOverrideModifier = (modifier: ts.ModifierLike): boolean =>
  modifier.kind === ts.SyntaxKind.OverrideKeyword

const findOverrideModifier = (
  modifiers: ReadonlyArray<ts.ModifierLike>
): Option.Option<ts.ModifierLike> => {
  const modifier = modifiers.find(isOverrideModifier)

  return Option.fromNullable(modifier)
}

const overrideModifier = (
  node: ts.MethodDeclaration
): Option.Option<ts.ModifierLike> => {
  const modifiers = ts.getModifiers(node)

  return Option.fromNullable(modifiers).pipe(
    Option.flatMap(findOverrideModifier)
  )
}

const isOverrideMethod = (node: ts.MethodDeclaration): boolean => {
  const modifier = overrideModifier(node)

  return Option.isSome(modifier)
}

const isReportableMethod = (node: ts.MethodDeclaration): boolean =>
  [hasBody(node), !isOverrideMethod(node)].every(Boolean)

const methodImplementationMatch =
  (context: RuleContext) =>
  (node: ts.MethodDeclaration): RuleMatch => {
    const reportTarget = namedNodeReportTarget(node)

    return createRuleMatch(context, {
      ruleId,
      node: reportTarget,
      message: "Avoid implementing methods on a class.",
      hint:
        "A class method that carries a body couples behavior to an object, which is " +
        "object-oriented programming and is not allowed. Extract the logic into a reusable " +
        "exported function that takes the data as a parameter. The only permitted method " +
        "implementation is one that overrides a base-class method (marked with `override`) for the purposes of integrating with a third-party library."
    })
  }

const methodImplementationMatches = (
  node: ts.MethodDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const reportable = Option.liftPredicate(isReportableMethod)(node)

  return reportable.pipe(
    Option.map(methodImplementationMatch(context)),
    Option.toArray
  )
}

const check = onNode(
  methodDeclarationKinds,
  isMethodDeclaration,
  methodImplementationMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/model/user.ts",
  code: `class User extends Schema.Class<User>("User")({
  name: Schema.String
}) {
  greet(): string { return \`Hello, \${this.name}\` }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/model/user.ts",
  code: `class User extends Schema.Class<User>("User")({
  name: Schema.String
}) {}

const greet = (user: User): string => \`Hello, \${user.name}\``
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noClassMethodImplementations = new Rule({
  id: ruleId,
  description:
    "Disallow implementing methods on a class, except methods that override a base-class method.",
  example,
  check
})
