import { Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
import { isExtendsClause, namedNodeReportTarget } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-root-level-classes"

type ClassNode = ts.ClassDeclaration | ts.ClassExpression

const classNodeKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.ClassExpression
]

const isClassNode = (node: ts.Node): node is ClassNode =>
  ts.isClassDeclaration(node) || ts.isClassExpression(node)

const lacksExtendsClause = (declaration: ClassNode): boolean =>
  !(declaration.heritageClauses ?? []).some(isExtendsClause)

const rootLevelClassMatch =
  (match: CreateMatch) =>
  (declaration: ClassNode): RuleMatch => {
    const node = namedNodeReportTarget(declaration)

    return match({
      ruleId,
      node,
      message: "Avoid classes that do not extend another class.",
      hint:
        "Classes should never implement data structures, algorithms, or modules — model those " +
        "with a functional approach (plain functions over Effect data types). The only sanctioned " +
        "use of a class is integrating with a third-party library that requires subclassing, so " +
        "every class must extend some other class as proof of that integration — for example " +
        "extending Effect's Schema.Class, Schema.TaggedError, Data.TaggedClass, or a base class " +
        "from the library you are integrating with."
    })
  }

// The context stage runs once per file, so ruleMatch is shared by every class node the dispatcher feeds to matches.
const rootLevelClassMatches = (context: RuleContext) => {
  const ruleMatch = rootLevelClassMatch(createRuleMatch(context))

  const matches = (declaration: ClassNode): ReadonlyArray<RuleMatch> =>
    pipe(
      Option.liftPredicate(lacksExtendsClause)(declaration),
      Option.map(ruleMatch),
      Option.toArray
    )

  return matches
}

const check = onNode(classNodeKinds)(isClassNode)(rootLevelClassMatches)

const badExample = new ExampleSnippet({
  filePath: "src/model/user.ts",
  code: `export class UserService {
  getUser(id: string) { /* ... */ }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/model/user.ts",
  code: `import { Schema } from "effect"

export class User extends Schema.Class<User>("User")({
  id: Schema.String,
  name: Schema.String
}) {}`
})

const moduleGoodExample = new ExampleSnippet({
  filePath: "src/model/account.ts",
  code: `import { Effect, Schema, pipe } from "effect"

const AccountId = pipe(Schema.String, Schema.brand("AccountId"))
type AccountId = typeof AccountId.Type

export const Account = Schema.Struct({
  id: AccountId,
  name: Schema.String
})
export type Account = typeof Account.Type

export const getById = Effect.fn("account/getById")(function* (id: AccountId) {})`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample, moduleGoodExample]
})

export const noRootLevelClasses = new Rule({
  id: ruleId,
  description:
    "Disallow classes that do not extend another class in favor of a functional approach.",
  example,
  check
})
