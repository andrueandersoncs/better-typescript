import * as ts from "typescript"
import { And, Kind, Property, TextEquals } from "../matcher/language.js"
import { MatcherRuleSpec, matcherRule } from "./matcherRule.js"
import { ExampleSnippet, RuleExample } from "./types.js"

const identifier = new Kind({ kind: ts.SyntaxKind.Identifier })

const errorText = new TextEquals({ value: "Error" })

const errorIdentifier = new And({ terms: [identifier, errorText] })

const errorCallee = new Property({ name: "expression", term: errorIdentifier })

const newExpression = new Kind({ kind: ts.SyntaxKind.NewExpression })

// Only bare `new Error(...)` counts: a qualified constructor such as lib.Error keeps its identifier nested and never satisfies the callee property.
const bareErrorConstruction = new And({
  terms: [newExpression, errorCallee]
})

const badExample = new ExampleSnippet({
  filePath: "src/errors.ts",
  code: `export const err = new Error("Not found")`
})

const goodExample = new ExampleSnippet({
  filePath: "src/errors.ts",
  code: `import { Schema } from "effect"

class NotFound extends Schema.TaggedError<NotFound>("NotFound")("NotFound", {}) {}

export const err = new NotFound()`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

const spec = new MatcherRuleSpec({
  id: "no-new-error",
  description:
    "Disallow direct Error construction in favor of Effect Schema tagged errors.",
  matcher: bareErrorConstruction,
  message: "Avoid using new Error() directly.",
  hint:
    "Declare a custom error with Effect Schema.TaggedError, then use new CustomError() " +
    "instead of bare new Error().",
  example
})

export const noNewError = matcherRule(spec)
