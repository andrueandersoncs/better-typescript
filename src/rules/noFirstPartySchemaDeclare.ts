import { Option, Struct } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { isFirstPartySymbol } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-first-party-schema-declare"

// --- Detection ---

const hasDeclareText = (name: ts.MemberName): boolean => name.text === "declare"

const isDeclarePropertyAccess = (
  expression: ts.Expression
): expression is ts.PropertyAccessExpression =>
  ts.isPropertyAccessExpression(expression) && hasDeclareText(expression.name)

const isSchemaText = (identifier: ts.Identifier): boolean =>
  identifier.text === "Schema"

const isSchemaObject = (expression: ts.Expression): boolean =>
  ts.isIdentifier(expression) && isSchemaText(expression)

const accessExpression: (access: ts.PropertyAccessExpression) => ts.Expression =
  Struct.get("expression")

const isSchemaPropertyAccess = (
  access: ts.PropertyAccessExpression
): boolean => {
  const object = accessExpression(access)

  return isSchemaObject(object)
}

const hasArguments = (call: ts.CallExpression): boolean =>
  call.arguments.length > 0

const isDeclareCall = (node: ts.Node): node is ts.CallExpression =>
  ts.isCallExpression(node) && isDeclarePropertyAccess(node.expression)

const isDeclareCallOnSchema = (call: ts.CallExpression): boolean => {
  const access = call.expression as ts.PropertyAccessExpression
  const isOnSchema = isSchemaPropertyAccess(access)

  return isOnSchema && hasArguments(call)
}

// --- Type analysis ---

const firstCallSignature = (type: ts.Type): Option.Option<ts.Signature> => {
  const signatures = type.getCallSignatures()

  return Option.fromNullable(signatures[0])
}

const signatureTypePredicate =
  (checker: ts.TypeChecker) =>
  (signature: ts.Signature): Option.Option<ts.TypePredicate> => {
    const predicate = checker.getTypePredicateOfSignature(signature)

    return Option.fromNullable(predicate)
  }

const typePredicateAssertedType = (
  predicate: ts.TypePredicate
): Option.Option<ts.Type> => Option.fromNullable(predicate.type)

const predicateAssertedType =
  (checker: ts.TypeChecker) =>
  (predicate: ts.Expression): Option.Option<ts.Type> => {
    const type = checker.getTypeAtLocation(predicate)

    return firstCallSignature(type).pipe(
      Option.flatMap(signatureTypePredicate(checker)),
      Option.flatMap(typePredicateAssertedType)
    )
  }

const typeSymbol = (type: ts.Type): Option.Option<ts.Symbol> => {
  const symbol = type.aliasSymbol ?? type.getSymbol()

  return Option.fromNullable(symbol)
}

const isFirstPartyType = (type: ts.Type): boolean => {
  const symbol = typeSymbol(type)

  return Option.exists(symbol, isFirstPartySymbol)
}

const hasCallSignatures = (type: ts.Type): boolean =>
  type.getCallSignatures().length > 0

const isFirstPartyDataStructure = (type: ts.Type): boolean => {
  const isFirstParty = isFirstPartyType(type)
  const isDataStructure = !hasCallSignatures(type)

  return isFirstParty && isDataStructure
}

const symbolName: (symbol: ts.Symbol) => string = Struct.get("name")

const fallbackTypeName = (): string => "unknown"

const typeName = (type: ts.Type): string =>
  typeSymbol(type).pipe(
    Option.map(symbolName),
    Option.getOrElse(fallbackTypeName)
  )

// --- Rule match ---

const schemaDeclareMessage = (assertedType: ts.Type): string =>
  `Avoid Schema.declare for the first-party type "${typeName(assertedType)}".`

const schemaDeclareHint =
  "Schema.declare is meant for integrating third-party types you do not control. " +
  "For types you own, define a proper Schema — for example class MyType extends " +
  'Schema.Class<MyType>("MyType")({ ... }) {} — which gives you validation, ' +
  "encoding, and decoding for free."

const schemaDeclareMatchSource =
  (context: RuleContext, call: ts.CallExpression) =>
  (assertedType: ts.Type): RuleMatch => {
    const name = typeName(assertedType)

    return createRuleMatch(context, {
      ruleId,
      node: call,
      message: `Avoid Schema.declare for the first-party type "${name}".`,
      hint: schemaDeclareHint
    })
  }

const firstArgument = (call: ts.CallExpression): Option.Option<ts.Expression> =>
  Option.fromNullable(call.arguments[0])

const schemaDeclareMatchOption =
  (context: RuleContext) =>
  (call: ts.CallExpression): Option.Option<RuleMatch> =>
    firstArgument(call).pipe(
      Option.flatMap(predicateAssertedType(context.checker)),
      Option.filter(isFirstPartyDataStructure),
      Option.map(schemaDeclareMatchSource(context, call))
    )

const schemaDeclareCallMatches =
  (context: RuleContext) =>
  (call: ts.CallExpression): ReadonlyArray<RuleMatch> => {
    const match = schemaDeclareMatchOption(context)(call)

    return Option.toArray(match)
  }

const schemaDeclareMatches = (
  call: ts.CallExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  isDeclareCallOnSchema(call) ? schemaDeclareCallMatches(context)(call) : []

const check = onNode(
  [ts.SyntaxKind.CallExpression],
  isDeclareCall,
  schemaDeclareMatches
)

// --- Examples ---

const badExample = new ExampleSnippet({
  filePath: "src/schema.ts",
  code: `type MyData = { readonly name: string }

const isMyData = (input: unknown): input is MyData =>
  typeof input === "object" && input !== null && "name" in input

const MyDataSchema = Schema.declare(isMyData)`
})

const goodExample = new ExampleSnippet({
  filePath: "src/schema.ts",
  code: `class MyData extends Schema.Class<MyData>("MyData")({
  name: Schema.String
}) {}`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noFirstPartySchemaDeclare = new Rule({
  id: ruleId,
  description:
    "Disallow Schema.declare for first-party types — use a proper Schema definition instead.",
  example,
  check
})
