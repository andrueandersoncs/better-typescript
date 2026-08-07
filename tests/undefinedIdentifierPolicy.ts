import { Array } from "effect"
import * as ts from "typescript"
import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { makeNodeMatch } from "@better-typescript/matchers/matcher/makeNodeMatch"
import { nodeMatcher } from "@better-typescript/matchers/matcher/nodeMatcher"
import type { UndefinedIdentifierFact } from "./undefinedIdentifierFact.js"

const undefinedIdentifier = (node: ts.Node): node is ts.Identifier =>
  ts.isIdentifier(node) && node.text === "undefined"

const undefinedIdentifierFact: UndefinedIdentifierFact = { kind: "undefined-identifier" }

const undefinedMatcher = nodeMatcher(Array.of(ts.SyntaxKind.Identifier))(undefinedIdentifier)(
  () => (node) => Array.of(makeNodeMatch(node, undefinedIdentifierFact))
)

export const undefinedPolicy = makePolicy({
  name: "undefined-identifier",
  matcher: undefinedMatcher,
  guidance: () => (match) =>
    makeFindings(
      match.target,
      "Undefined identifier.",
      "Model absence explicitly with Option.",
      match.fact
    ),
  examples: { _tag: "inline", examples: Array.empty() }
})
