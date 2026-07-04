import * as ts from "typescript"
import { And, AtLeast, Kind, Or, Property } from "../matcher/language.js"
import { MatcherRuleSpec, matcherRule } from "./matcherRule.js"
import { ExampleSnippet, RuleExample } from "./types.js"

const anyKeyword = new Kind({ kind: ts.SyntaxKind.AnyKeyword })

// Counts the return type node itself and every nested type, so `: any` and `: Promise<any>` both satisfy.
const containsAny = new AtLeast({ minimum: 1, term: anyKeyword })

const anyReturnType = new Property({ name: "type", term: containsAny })

const functionDeclaration = new Kind({
  kind: ts.SyntaxKind.FunctionDeclaration
})

const functionExpression = new Kind({
  kind: ts.SyntaxKind.FunctionExpression
})

const arrowFunction = new Kind({ kind: ts.SyntaxKind.ArrowFunction })

const methodDeclaration = new Kind({ kind: ts.SyntaxKind.MethodDeclaration })

const methodSignature = new Kind({ kind: ts.SyntaxKind.MethodSignature })

const callSignature = new Kind({ kind: ts.SyntaxKind.CallSignature })

const functionType = new Kind({ kind: ts.SyntaxKind.FunctionType })

const getAccessor = new Kind({ kind: ts.SyntaxKind.GetAccessor })

const returnTypeDeclaration = new Or({
  terms: [
    functionDeclaration,
    functionExpression,
    arrowFunction,
    methodDeclaration,
    methodSignature,
    callSignature,
    functionType,
    getAccessor
  ]
})

const anyReturnDeclaration = new And({
  terms: [returnTypeDeclaration, anyReturnType]
})

const badExample = new ExampleSnippet({
  filePath: "src/config.ts",
  code: `const parseConfig = (raw: string): any =>
  JSON.parse(raw)`
})

const goodExample = new ExampleSnippet({
  filePath: "src/config.ts",
  code: `const parseConfig = (raw: string): unknown =>
  JSON.parse(raw)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

const spec = new MatcherRuleSpec({
  id: "no-explicit-any-return",
  description: "Disallow explicit any in function return types.",
  matcher: anyReturnDeclaration,
  message: "Avoid function return types that include any.",
  hint:
    "Declare a precise return type instead of any. If the value is unknown at a boundary, " +
    "use unknown and narrow before use.",
  example
})

export const noExplicitAnyReturn = matcherRule(spec)
