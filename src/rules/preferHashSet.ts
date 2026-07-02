import { Option, pipe } from "effect"
import * as ts from "typescript"
import { combineAll, onNode } from "./ruleCheck.js"
import { isInAmbientContext, typeNameIdentifier } from "./tsNode.js"
import {
  constructionEscapesExternally,
  typeReferenceEscapesExternally
} from "./tsSignature.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-hash-set"

// --- new Set(...) detection ---

const isSetIdentifier = (identifier: ts.Identifier): boolean =>
  identifier.text === "Set"

const constructorMessage = "Avoid constructing a built-in Set."

const constructorHint =
  "Use Effect's HashSet instead — for example HashSet.fromIterable([1, 2, 3]) or " +
  "HashSet.empty(). HashSet integrates with Equal and Hash traits for structural equality. " +
  "Constructing a Set is permitted only when it is handed to a third-party API that " +
  "requires one."

const newSetMatches =
  (context: RuleContext) =>
  (newExpression: ts.NewExpression): ReadonlyArray<RuleMatch> => {
    const expressionOption = Option.liftPredicate(ts.isIdentifier)(
      newExpression.expression
    )
    const isSetConstruction = Option.exists(expressionOption, isSetIdentifier)
    const escapesExternally =
      isSetConstruction &&
      constructionEscapesExternally(context.checker)(newExpression)
    const isReportable = [isSetConstruction, !escapesExternally].every(Boolean)

    return isReportable
      ? [
          createRuleMatch(context)({
            ruleId,
            node: newExpression,
            message: constructorMessage,
            hint: constructorHint
          })
        ]
      : []
  }

// --- Set<T> / ReadonlySet<T> type reference detection ---

const setTypeNames: ReadonlyArray<string> = ["Set", "ReadonlySet"]

const isSetTypeName = (id: ts.Identifier): boolean =>
  setTypeNames.includes(id.text)

const isSetTypeReference = (node: ts.Node): node is ts.TypeReferenceNode =>
  pipe(
    Option.liftPredicate(ts.isTypeReferenceNode)(node),
    Option.flatMap(typeNameIdentifier),
    Option.exists(isSetTypeName)
  )

const typeRefHint =
  "Use HashSet.HashSet<T> from Effect instead. HashSet integrates with Equal and Hash " +
  "traits for structural equality. Writing the built-in Set type is permitted only where " +
  "it mirrors a third-party contract: ambient declarations and values that cross into a " +
  "third-party call."

const setTypeRefMatches =
  (context: RuleContext) =>
  (typeRef: ts.TypeReferenceNode): ReadonlyArray<RuleMatch> => {
    const isAmbient = isInAmbientContext(typeRef)
    const escapesExternally = typeReferenceEscapesExternally(context.checker)(
      typeRef
    )
    const isBoundaryMirror = isAmbient || escapesExternally

    if (isBoundaryMirror) {
      return []
    }

    const name = (typeRef.typeName as ts.Identifier).text
    const message = `Avoid the built-in ${name} type.`

    return [
      createRuleMatch(context)({
        ruleId,
        node: typeRef,
        message,
        hint: typeRefHint
      })
    ]
  }

// --- listeners ---

const constructorListener = onNode([ts.SyntaxKind.NewExpression])(
  ts.isNewExpression
)(newSetMatches)

const typeReferenceListener = onNode([ts.SyntaxKind.TypeReference])(
  isSetTypeReference
)(setTypeRefMatches)

const check = combineAll([constructorListener, typeReferenceListener])

// --- examples ---

const badExample = new ExampleSnippet({
  filePath: "src/collections.ts",
  code: `const ids = new Set<number>([1, 2, 3])
const has = ids.has(2)`
})

const goodExample = new ExampleSnippet({
  filePath: "src/collections.ts",
  code: `import { HashSet } from "effect"

const ids = HashSet.make(1, 2, 3)
const has = HashSet.has(ids, 2)`
})

const goodBoundaryExample = new ExampleSnippet({
  filePath: "src/boundary.ts",
  code: `import { HashSet } from "effect"

declare const loadIds: () => Set<number>

const ids = loadIds()

export const idSet = HashSet.fromIterable(ids)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample, goodBoundaryExample]
})

export const preferHashSet = new Rule({
  id: ruleId,
  description:
    "Disallow built-in Set in favor of Effect's HashSet for structural equality; " +
    "Set stays legal where a third-party contract requires it.",
  example,
  check
})
