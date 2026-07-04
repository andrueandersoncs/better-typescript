import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import * as ts from "typescript"
import {
  And,
  Anything,
  AtLeast,
  Kind,
  FindingOf,
  FindingWithFacet,
  Not,
  Or,
  Parent,
  Property,
  TextEquals,
  describeMatcher,
  matcherMentions
} from "../src/matcher/language.js"
import type { Matcher } from "../src/matcher/language.js"
import { loadProject } from "../src/project/loadProject.js"
import { Finding, rules } from "../src/rules/index.js"
import { MatcherRuleSpec, matcherRule } from "../src/rules/matcherRule.js"
import { ExampleSnippet, RuleExample } from "../src/rules/types.js"
import {
  ConditionContext,
  evaluateMatcher
} from "../src/runner/evaluateMatcher.js"
import { runRules } from "../src/runner/runRules.js"
import { summarizeFileFindings } from "../src/syndromes/summary.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))

const matcherFixturePath = path.join(
  testDirectory,
  "fixtures",
  "no-non-null-assertion"
)

const testRuleExample = new RuleExample({
  bad: [new ExampleSnippet({ filePath: "src/bad.ts", code: "bad" })],
  good: [new ExampleSnippet({ filePath: "src/good.ts", code: "good" })]
})

const runFixtureMatcher = async (
  ruleId: string,
  matcher: Matcher
): Promise<ReadonlyArray<Finding>> => {
  const adHocRule = matcherRule(
    new MatcherRuleSpec({
      id: ruleId,
      description: "Test-only matcher rule.",
      matcher,
      message: "Test-only message.",
      hint: "Test-only hint.",
      example: testRuleExample
    })
  )
  const workspace = await Effect.runPromise(loadProject(matcherFixturePath))

  return workspace.projects.flatMap((project) => runRules([adHocRule])(project))
}

const matchLocations = (
  matches: ReadonlyArray<Finding>
): ReadonlyArray<string> => {
  const locations = matches.map(
    (match) => `${match.path}:${match.line}:${match.column}`
  )

  return [...locations].sort()
}

const matchAt = (ruleId: string, line: number): Finding =>
  new Finding({
    detectorId: ruleId,
    path: "src/subject.ts",
    line,
    column: 1,
    message: "message",
    hint: "hint",
    facets: []
  })

const roleOf = (ruleId: string): "finding" | "signal" =>
  ruleId === "prefer-curried-data-last-functions" ? "signal" : "finding"

const contextOf = (matches: ReadonlyArray<Finding>): ConditionContext => {
  const summary = summarizeFileFindings(roleOf)(matches)
  const findingMatches = matches.filter(
    (match) => roleOf(match.detectorId) === "finding"
  )

  return new ConditionContext({
    summary,
    findingMatches,
    projectSummary: summary
  })
}

const subject = contextOf([
  matchAt("no-throw", 1),
  matchAt("no-throw", 2),
  matchAt("no-mutation", 3)
])

test("And requires every term and carries the full trace", () => {
  const both = new And({
    terms: [
      new FindingOf({ detectorId: "no-throw" }),
      new FindingOf({ detectorId: "no-mutation" })
    ]
  })
  const result = evaluateMatcher(subject)(both)

  assert.equal(result.satisfied, true)
  assert.deepEqual(
    result.evidence.map((item) => item.measure),
    ["no-throw", "no-mutation"]
  )
})

test("Or fires on any satisfied branch and Not inverts", () => {
  const missing = new FindingOf({ detectorId: "no-callbacks" })
  const present = new FindingOf({ detectorId: "no-throw" })
  const either = new Or({ terms: [missing, present] })
  const negated = new Not({ term: missing })

  assert.equal(evaluateMatcher(subject)(either).satisfied, true)
  assert.equal(evaluateMatcher(subject)(missing).satisfied, false)
  assert.equal(evaluateMatcher(subject)(negated).satisfied, true)
})

test("AtLeast counts through combinators via the per-match walk", () => {
  const eitherRule = new Or({
    terms: [
      new FindingOf({ detectorId: "no-throw" }),
      new FindingOf({ detectorId: "no-mutation" })
    ]
  })
  const three = new AtLeast({ minimum: 3, term: eitherRule })
  const four = new AtLeast({ minimum: 4, term: eitherRule })

  assert.equal(evaluateMatcher(subject)(three).satisfied, true)
  assert.equal(evaluateMatcher(subject)(four).satisfied, false)
  assert.equal(evaluateMatcher(subject)(three).evidence[0].count, 3)
})

test("matcherMentions collects rule references through every combinator", () => {
  const nested = new Not({
    term: new AtLeast({
      minimum: 2,
      term: new Or({
        terms: [
          new FindingOf({ detectorId: "no-throw" }),
          new FindingWithFacet({
            detectorId: "no-mutation",
            facet: "shared-state"
          }),
          new FindingOf({ detectorId: "prefer-curried-data-last-functions" })
        ]
      })
    })
  })

  assert.deepEqual(matcherMentions(nested), [
    "no-throw",
    "no-mutation",
    "prefer-curried-data-last-functions"
  ])
})

test("matcherMentions collects rule references through structural navigation", () => {
  const nested = new And({
    terms: [
      new Parent({ term: new FindingOf({ detectorId: "parent-rule" }) }),
      new Property({
        name: "initializer",
        term: new FindingOf({ detectorId: "property-rule" })
      })
    ]
  })

  assert.deepEqual(matcherMentions(nested), ["parent-rule", "property-rule"])
})

test("describeMatcher yields the measure labels evidence relies on", () => {
  const facet = new FindingWithFacet({
    detectorId: "no-mutation",
    facet: "shared-state"
  })
  const counted = new AtLeast({ minimum: 8, term: facet })

  assert.equal(describeMatcher(facet), "no-mutation/shared-state")
  assert.equal(describeMatcher(counted), "no-mutation/shared-state")
})

test("describeMatcher labels structural navigation atoms", () => {
  assert.equal(describeMatcher(new Anything()), "anything")
  assert.equal(
    describeMatcher(
      new Parent({
        term: new Kind({ kind: ts.SyntaxKind.ClassDeclaration })
      })
    ),
    "parent(kind ClassDeclaration)"
  )
  assert.equal(
    describeMatcher(new Property({ name: "expression", term: new Anything() })),
    "expression(anything)"
  )
})

test("an AST-fragment matcher compiles to a rule reaching node properties", async () => {
  const legacyIdentifier = new And({
    terms: [
      new Kind({ kind: ts.SyntaxKind.Identifier }),
      new TextEquals({ value: "legacyGlobal" })
    ]
  })
  const example = new RuleExample({
    bad: [new ExampleSnippet({ filePath: "src/bad.ts", code: "bad" })],
    good: [new ExampleSnippet({ filePath: "src/good.ts", code: "good" })]
  })
  const adHocRule = matcherRule(
    new MatcherRuleSpec({
      id: "ad-hoc-legacy-global",
      description: "Test-only matcher rule.",
      matcher: legacyIdentifier,
      message: "Avoid the legacy global.",
      hint: "Test-only.",
      example
    })
  )
  const fixturePath = path.join(
    testDirectory,
    "fixtures",
    "no-non-null-assertion"
  )
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const matches = workspace.projects.flatMap((project) =>
    runRules([adHocRule])(project)
  )

  assert.deepEqual(
    matches.map((match) => `${match.path}:${match.line}`),
    ["src/allowed.ts:13"]
  )
})

test("Property navigation filters a compiled rule through a child node", async () => {
  const fromNullableCall = new And({
    terms: [
      new Kind({ kind: ts.SyntaxKind.CallExpression }),
      new Property({
        name: "expression",
        term: new And({
          terms: [
            new Kind({ kind: ts.SyntaxKind.PropertyAccessExpression }),
            new TextEquals({ value: "Option.fromNullable" })
          ]
        })
      })
    ]
  })
  const matches = await runFixtureMatcher(
    "ad-hoc-from-nullable-call",
    fromNullableCall
  )

  assert.deepEqual(matchLocations(matches), ["src/allowed.ts:9:19"])
  assert.deepEqual(
    matches.map((match) => match.message),
    ["Test-only message."]
  )
})

test("Property navigation reads node arrays and rejects missing properties", async () => {
  const getOrElseCallWithMaybeNameArgument = new And({
    terms: [
      new Kind({ kind: ts.SyntaxKind.CallExpression }),
      new Property({
        name: "arguments",
        term: new And({
          terms: [
            new Kind({ kind: ts.SyntaxKind.Identifier }),
            new TextEquals({ value: "maybeName" })
          ]
        })
      })
    ]
  })
  const argumentMatches = await runFixtureMatcher(
    "ad-hoc-maybe-name-argument",
    getOrElseCallWithMaybeNameArgument
  )

  assert.deepEqual(matchLocations(argumentMatches), ["src/allowed.ts:11:28"])

  const variableDeclaration = new Kind({
    kind: ts.SyntaxKind.VariableDeclaration
  })
  const unguardedMatches = await runFixtureMatcher(
    "ad-hoc-variable-declaration",
    variableDeclaration
  )
  const missingPropertyMatches = await runFixtureMatcher(
    "ad-hoc-missing-property",
    new And({
      terms: [
        variableDeclaration,
        new Property({
          name: "nonexistentChild",
          term: new Anything()
        })
      ]
    })
  )

  assert.deepEqual(matchLocations(unguardedMatches), [
    "src/allowed.ts:11:14",
    "src/allowed.ts:13:14",
    "src/allowed.ts:7:15",
    "src/allowed.ts:9:7",
    "src/cases.ts:5:15",
    "src/cases.ts:7:14",
    "src/cases.ts:9:14"
  ])
  assert.deepEqual(matchLocations(missingPropertyMatches), [])
})

test("Parent navigation requires the immediate parent node", async () => {
  const maybeNameDeclaredByVariable = new And({
    terms: [
      new Kind({ kind: ts.SyntaxKind.Identifier }),
      new TextEquals({ value: "maybeName" }),
      new Parent({
        term: new Kind({ kind: ts.SyntaxKind.VariableDeclaration })
      })
    ]
  })
  const matches = await runFixtureMatcher(
    "ad-hoc-maybe-name-variable-parent",
    maybeNameDeclaredByVariable
  )

  assert.deepEqual(matchLocations(matches), ["src/allowed.ts:9:7"])
})

test("structural navigation interiors do not create dispatch keys", async () => {
  const matches = await runFixtureMatcher(
    "ad-hoc-inert-property-dispatch",
    new Property({
      name: "expression",
      term: new Kind({ kind: ts.SyntaxKind.Identifier })
    })
  )

  assert.deepEqual(matchLocations(matches), [])
})

test("signal atoms count only through the index at match level", () => {
  const signal = new FindingOf({
    detectorId: "prefer-curried-data-last-functions"
  })
  const withSignals = contextOf([
    matchAt("prefer-curried-data-last-functions", 1),
    matchAt("prefer-curried-data-last-functions", 2)
  ])
  const result = evaluateMatcher(withSignals)(
    new AtLeast({ minimum: 2, term: signal })
  )

  assert.equal(result.satisfied, true)
  assert.equal(result.evidence[0].count, 2)
})

const findingRuleIds = new Set(rules.map((rule) => rule.id))

test("syndrome rule references stay within the registry", () => {
  assert.ok(findingRuleIds.has("no-non-null-assertion"))
})
