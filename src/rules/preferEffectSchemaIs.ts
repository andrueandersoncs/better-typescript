import { Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { isFirstPartySymbol, unwrapExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-effect-schema-is"

const tagPropertyName = "_tag"

const strictTagComparisonOperators = HashSet.make(
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
)

const hasTagPropertyName = (expression: ts.PropertyAccessExpression): boolean =>
  expression.name.text === tagPropertyName

const tagPropertyAccess = (
  expression: ts.Expression
): Option.Option<ts.PropertyAccessExpression> => {
  const unwrapped = unwrapExpression(expression)

  return pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped),
    Option.filter(hasTagPropertyName)
  )
}

const stringLiteralExpression = (
  expression: ts.Expression
): Option.Option<ts.StringLiteralLike> => {
  const unwrapped = unwrapExpression(expression)

  return Option.liftPredicate(ts.isStringLiteralLike)(unwrapped)
}

const hasTagPropertyOperand = (expression: ts.Expression): boolean => {
  const access = tagPropertyAccess(expression)

  return Option.isSome(access)
}

const hasStringLiteralOperand = (expression: ts.Expression): boolean => {
  const literal = stringLiteralExpression(expression)

  return Option.isSome(literal)
}

const isSchemaTagComparisonBinary = (node: ts.BinaryExpression): boolean => {
  const isStrictComparison = HashSet.has(
    strictTagComparisonOperators,
    node.operatorToken.kind
  )
  const leftTagRightString =
    hasTagPropertyOperand(node.left) && hasStringLiteralOperand(node.right)
  const leftStringRightTag =
    hasStringLiteralOperand(node.left) && hasTagPropertyOperand(node.right)
  const hasTagComparison = leftTagRightString || leftStringRightTag

  return isStrictComparison && hasTagComparison
}

const isSchemaTagComparison = (node: ts.Node): node is ts.BinaryExpression =>
  pipe(
    Option.liftPredicate(ts.isBinaryExpression)(node),
    Option.exists(isSchemaTagComparisonBinary)
  )

const checkedValueText =
  (sourceFile: ts.SourceFile) =>
  (access: ts.PropertyAccessExpression): string =>
    access.expression.getText(sourceFile)

const constituentIsFirstParty = (type: ts.Type): boolean => {
  const aliasSymbol = Option.fromNullable(type.aliasSymbol)
  const typeSymbol = type.getSymbol()
  const ownSymbol = Option.fromNullable(typeSymbol)
  const symbol = Option.orElse(aliasSymbol, Function.constant(ownSymbol))

  return Option.exists(symbol, isFirstPartySymbol)
}

// Schema.is(Class) uses instanceof semantics: rewriting a _tag check on a type the project does not declare (plain JSON, third-party unions) would invert its runtime result.
const isFirstPartyTagAccess =
  (checker: ts.TypeChecker) =>
  (access: ts.PropertyAccessExpression): boolean => {
    const checkedType = checker.getTypeAtLocation(access.expression)
    const constituents = checkedType.isUnion()
      ? checkedType.types
      : [checkedType]

    return constituents.every(constituentIsFirstParty)
  }

const schemaIsMatches =
  (context: RuleContext) =>
  (expression: ts.BinaryExpression): ReadonlyArray<RuleMatch> => {
    const sourceFile = context.sourceFile
    const leftAccess = tagPropertyAccess(expression.left)
    const rightAccess = tagPropertyAccess(expression.right)
    const accessOptions = [leftAccess, rightAccess]
    const tagAccess = Option.firstSomeOf(accessOptions)
    const isFirstParty = Option.exists(
      tagAccess,
      isFirstPartyTagAccess(context.checker)
    )

    if (!isFirstParty) {
      return []
    }
    const valueText = pipe(
      tagAccess,
      Option.map(checkedValueText(sourceFile)),
      Option.getOrElse(Function.constant("the value"))
    )
    const operatorText = expression.operatorToken.getText(sourceFile)
    const leftLiteral = stringLiteralExpression(expression.left)
    const rightLiteral = stringLiteralExpression(expression.right)
    const literalOptions = [leftLiteral, rightLiteral]
    const tagText = pipe(
      Option.firstSomeOf(literalOptions),
      Option.map(Struct.get("text")),
      Option.getOrElse(Function.constant("$tag"))
    )
    const schemaIsCheck = `Schema.is($schema)(${valueText})`
    const isNegated =
      expression.operatorToken.kind ===
      ts.SyntaxKind.ExclamationEqualsEqualsToken
    const suggestion = isNegated ? `!${schemaIsCheck}` : schemaIsCheck

    return [
      createRuleMatch(context)({
        ruleId,
        node: expression,
        message: `Avoid checking ${valueText}._tag ${operatorText} "${tagText}" directly.`,
        hint:
          `Replace the tag check with ${suggestion}, using the Effect Schema class for ` +
          `"${tagText}".`
      })
    ]
  }

const check = onNode([ts.SyntaxKind.BinaryExpression])(isSchemaTagComparison)(
  schemaIsMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/shape.ts",
  code: `interface Circle {
  readonly _tag: "Circle"
  readonly radius: number
}

interface Square {
  readonly _tag: "Square"
  readonly side: number
}

declare const circleArea: (circle: Circle) => number

export const area = (shape: Circle | Square) => {
  if (shape._tag === "Circle") {
    return circleArea(shape)
  }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/shape.ts",
  code: `import { Schema } from "effect"

class Circle extends Schema.TaggedClass<Circle>()("Circle", {
  radius: Schema.Number
}) {}

class Square extends Schema.TaggedClass<Square>()("Square", {
  side: Schema.Number
}) {}

declare const circleArea: (circle: Circle) => number

export const area = (shape: Circle | Square) => {
  if (Schema.is(Circle)(shape)) {
    return circleArea(shape)
  }
}`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferEffectSchemaIs = new Rule({
  id: ruleId,
  description:
    "Prefer Schema.is over direct _tag comparisons on first-party types; tags on " +
    "third-party unions (where no Schema class exists) are left alone.",
  example,
  check
})
