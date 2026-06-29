import { Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
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
  (context: RuleContext) =>
  (declaration: ClassNode): RuleMatch => {
    const node = namedNodeReportTarget(declaration)

    return createRuleMatch(context, {
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

const rootLevelClassMatches = (
  declaration: ClassNode,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  pipe(
    Option.liftPredicate(lacksExtendsClause)(declaration),
    Option.map(rootLevelClassMatch(context)),
    Option.toArray
  )

const check = onNode(classNodeKinds, isClassNode, rootLevelClassMatches)

const badExample = new ExampleSnippet({
  filePath: "src/model/user.ts",
  code: `class UserService {
  getUser(id: string) { /* ... */ }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/model/user.ts",
  code: `class User extends Schema.Class<User>("User")({
  id: Schema.String,
  name: Schema.String
}) {}`
})

const moduleGoodExample = new ExampleSnippet({
  filePath: "src/model/user.ts",
  code: `const UserId = pipe(Schema.String, Schema.brand("UserId"))
type UserId = typeof UserId.Type

export const User = Schema.Struct({
  id: UserId,
  name: Schema.String
})
export type User = typeof User.Type

export const getById = Effect.fn("user/getById")(function* (id: UserId) {})`
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
