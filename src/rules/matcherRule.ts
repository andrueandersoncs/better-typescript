import { Array, Match, Option, Predicate, Schema, pipe } from "effect"
import * as ts from "typescript"
import type {
  And,
  AtLeast,
  Kind,
  Matcher,
  Not,
  Or,
  TextEquals,
  TextIncludes
} from "../matcher/language.js"
import { matcherSchema } from "../matcher/language.js"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { foldAst } from "./traverse.js"
import type { AstFold } from "./traverse.js"
import { Rule, RuleExample, roleSchema } from "./types.js"
import type { RuleContext, Finding } from "./types.js"

// A rule defined as a sentence in the matcher language: the AST fragment (Kind, Text*, Anything, Parent, Property, combinators, AtLeast over descendants) compiled into the same listener machinery hand-written rules use.
export class MatcherRuleSpec extends Schema.Class<MatcherRuleSpec>(
  "MatcherRuleSpec"
)({
  id: Schema.String,
  description: Schema.String,
  matcher: matcherSchema,
  message: Schema.String,
  hint: Schema.String,
  example: RuleExample,
  role: roleSchema
}) {}

const noKinds = (): ReadonlyArray<ts.SyntaxKind> => []

const nestedKinds = (term: And | Or): ReadonlyArray<ts.SyntaxKind> =>
  term.terms.flatMap(collectKinds)

const innerKinds = (term: Not | AtLeast): ReadonlyArray<ts.SyntaxKind> =>
  collectKinds(term.term)

const ownKind = (term: Kind): ReadonlyArray<ts.SyntaxKind> => [term.kind]

// Dispatch keys for the listener table: every Kind atom describing the matched node itself. Navigation atoms (Parent, Property) describe other nodes, so their interiors contribute no keys; a matcher whose only Kind atoms sit inside navigation compiles to an inert rule, which per-rule fixture tests catch at authoring time.
const collectKinds = (matcher: Matcher): ReadonlyArray<ts.SyntaxKind> =>
  pipe(
    Match.value(matcher),
    Match.tag("Kind", ownKind),
    Match.tag("And", nestedKinds),
    Match.tag("Or", nestedKinds),
    Match.tag("Not", innerKinds),
    Match.tag("AtLeast", innerKinds),
    Match.orElse(noKinds)
  )

const countSatisfiedDescendants =
  (sourceFile: ts.SourceFile) =>
  (matcher: Matcher) =>
  (root: ts.Node): number => {
    const addSatisfied: AstFold<number> = (total, node) => {
      const satisfied = nodeSatisfies(sourceFile)(matcher)(node)

      return satisfied ? total + 1 : total
    }

    return foldAst(addSatisfied)(root)(0)
  }

const textEqualsAt =
  (sourceFile: ts.SourceFile) =>
  (node: ts.Node) =>
  (term: TextEquals): boolean => {
    const text = node.getText(sourceFile)

    return text === term.value
  }

const textIncludesAt =
  (sourceFile: ts.SourceFile) =>
  (node: ts.Node) =>
  (term: TextIncludes): boolean => {
    const text = node.getText(sourceFile)

    return text.includes(term.value)
  }

const recordHasNumericKind = (record: Record<string, unknown>): boolean =>
  Predicate.isNumber(record["kind"])

// A node property holds a child node, a node array, or a non-node primitive; structurally a child node is an object carrying a numeric kind.
const isNodeValue = (value: unknown): value is ts.Node => {
  const record = Option.liftPredicate(Predicate.isRecord)(value)

  return Option.exists(record, recordHasNumericKind)
}

const propertyChildNodes =
  (name: string) =>
  (node: ts.Node): ReadonlyArray<ts.Node> => {
    // Named children live as plain object properties on ts.Node; a dynamic read needs the node widened to an indexable record.
    const record = node as unknown as Record<string, unknown>
    const value = record[name]
    const singleOption = Option.liftPredicate(isNodeValue)(value)
    const singleList = Option.toArray(singleOption)

    return Array.isArray(value) ? value.filter(isNodeValue) : singleList
  }

// The L0 interpreter over syntax: one branch per AST-fragment term. Match-level atoms are false here — they evaluate at L1, and signal rules bridge the levels.
const nodeSatisfies =
  (sourceFile: ts.SourceFile) =>
  (matcher: Matcher) =>
  (node: ts.Node): boolean =>
    pipe(
      Match.value(matcher),
      Match.tag("Kind", (term) => node.kind === term.kind),
      Match.tag("TextIncludes", textIncludesAt(sourceFile)(node)),
      Match.tag("TextEquals", textEqualsAt(sourceFile)(node)),
      Match.tag("And", (term) =>
        term.terms.every(satisfiedAt(sourceFile)(node))
      ),
      Match.tag("Or", (term) => term.terms.some(satisfiedAt(sourceFile)(node))),
      Match.tag("Not", (term) => !nodeSatisfies(sourceFile)(term.term)(node)),
      Match.tag("Anything", () => true),
      Match.tag("Parent", (term) => {
        const parentSatisfies = nodeSatisfies(sourceFile)(term.term)
        const parent = Option.fromNullable(node.parent)

        return Option.exists(parent, parentSatisfies)
      }),
      Match.tag("Property", (term) => {
        const childSatisfies = nodeSatisfies(sourceFile)(term.term)
        const children = propertyChildNodes(term.name)(node)

        return children.some(childSatisfies)
      }),
      Match.tag("AtLeast", (term) => {
        const count = countSatisfiedDescendants(sourceFile)(term.term)(node)

        return count >= term.minimum
      }),
      Match.orElse(() => false)
    )

const satisfiedAt =
  (sourceFile: ts.SourceFile) =>
  (node: ts.Node) =>
  (matcher: Matcher): boolean =>
    nodeSatisfies(sourceFile)(matcher)(node)

const isAnyNode = (node: ts.Node): node is ts.Node => true

// The context stage runs once per file, so the compiled predicate and match partial are shared by every candidate node the dispatcher feeds to matches.
const matcherMatches = (spec: MatcherRuleSpec) => (context: RuleContext) => {
  const satisfies = nodeSatisfies(context.sourceFile)(spec.matcher)
  const match = createRuleMatch(context)

  const matches = (node: ts.Node): ReadonlyArray<Finding> =>
    satisfies(node)
      ? [
          match({
            ruleId: spec.id,
            node,
            message: spec.message,
            hint: spec.hint
          })
        ]
      : []

  return matches
}

export const matcherRule = (spec: MatcherRuleSpec): Rule => {
  const mentionedKinds = collectKinds(spec.matcher)
  const kinds = Array.dedupe(mentionedKinds)
  const check = onNode(kinds)(isAnyNode)(matcherMatches(spec))

  return new Rule({
    id: spec.id,
    description: spec.description,
    example: spec.example,
    check,
    role: spec.role
  })
}
