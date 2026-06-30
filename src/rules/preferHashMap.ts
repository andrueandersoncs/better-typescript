import { Option, pipe } from "effect"
import * as ts from "typescript"
import { combineAll, onNode } from "./ruleCheck.js"
import { typeNameIdentifier } from "./tsNode.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-hash-map"

// --- new Map(...) detection ---

const isMapIdentifier = (identifier: ts.Identifier): boolean =>
  identifier.text === "Map"

const constructorMessage = "Avoid constructing a built-in Map."

const constructorHint =
  "Use Effect's HashMap instead — for example HashMap.fromIterable([[\"a\", 1]]) or " +
  "HashMap.empty(). HashMap integrates with Equal and Hash traits for structural equality."

const newMapMatches = (
  newExpression: ts.NewExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const expressionOption = Option.liftPredicate(ts.isIdentifier)(
    newExpression.expression
  )
  const isMapConstruction = Option.exists(expressionOption, isMapIdentifier)

  return isMapConstruction
    ? [
        createRuleMatch(context, {
          ruleId,
          node: newExpression,
          message: constructorMessage,
          hint: constructorHint
        })
      ]
    : []
}

// --- Map<K, V> / ReadonlyMap<K, V> type reference detection ---

const mapTypeNames: ReadonlyArray<string> = ["Map", "ReadonlyMap"]

const isMapTypeName = (id: ts.Identifier): boolean =>
  mapTypeNames.includes(id.text)

const isMapTypeReference = (node: ts.Node): node is ts.TypeReferenceNode =>
  pipe(
    Option.liftPredicate(ts.isTypeReferenceNode)(node),
    Option.flatMap(typeNameIdentifier),
    Option.exists(isMapTypeName)
  )

const typeRefHint =
  "Use HashMap.HashMap<K, V> from Effect instead. HashMap integrates with Equal and Hash " +
  "traits for structural equality."

const mapTypeRefMatches = (
  typeRef: ts.TypeReferenceNode,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const name = (typeRef.typeName as ts.Identifier).text
  const message = `Avoid the built-in ${name} type.`

  return [
    createRuleMatch(context, {
      ruleId,
      node: typeRef,
      message,
      hint: typeRefHint
    })
  ]
}

// --- listeners ---

const constructorListener = onNode(
  [ts.SyntaxKind.NewExpression],
  ts.isNewExpression,
  newMapMatches
)

const typeReferenceListener = onNode(
  [ts.SyntaxKind.TypeReference],
  isMapTypeReference,
  mapTypeRefMatches
)

const check = combineAll([constructorListener, typeReferenceListener])

// --- examples ---

const badExample = new ExampleSnippet({
  filePath: "src/lookup.ts",
  code: `const lookup = new Map<string, number>([["a", 1], ["b", 2]])
const value = lookup.get("a")`
})

const goodExample = new ExampleSnippet({
  filePath: "src/lookup.ts",
  code: `import { HashMap } from "effect"

const lookup = HashMap.make(["a", 1], ["b", 2])
const value = HashMap.get(lookup, "a")`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferHashMap = new Rule({
  id: ruleId,
  description:
    "Disallow built-in Map in favor of Effect's HashMap for structural equality.",
  example,
  check
})
