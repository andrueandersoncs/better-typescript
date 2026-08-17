import { Array, Function, pipe } from "effect"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { mutationQualityMatcherCatalog } from "@better-typescript/matchers/builtins/mutationQualityMatcherCatalog"
import { safetyMatcherCatalog } from "@better-typescript/matchers/builtins/safetyMatcherCatalog"
import type { Match } from "@better-typescript/matchers/matcher/match"
import type { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"

const makeNoNestedIfStatements = () => {
  const message = "Avoid nesting if statements."

  const hint =
    "Combine related conditions with boolean operators, or use an early return so this " +
    "condition can remain a single-level if statement."

  const noNestedIfStatements = makeBuiltinPolicy({
    name: "no-nested-if-statements",
    matcher: safetyMatcherCatalog.noNestedIfStatementsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noNestedIfStatements
}

export const noNestedIfStatements = makeNoNestedIfStatements()

const makeNoNonNullAssertion = () => {
  const message = "Avoid non-null assertions."

  const hint =
    "The ! operator silences the type checker instead of handling the absent case, " +
    "trading a compile-time proof for a runtime crash. Convert the nullable value " +
    "with Option.fromNullishOr and handle both branches (Option.match, " +
    "Option.getOrElse), or narrow it with a type guard the checker verifies."

  const noNonNullAssertion = makeBuiltinPolicy({
    name: "no-non-null-assertion",
    matcher: safetyMatcherCatalog.noNonNullAssertionMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noNonNullAssertion
}

export const noNonNullAssertion = makeNoNonNullAssertion()

const makeNoDuplicateIfBodies = () => {
  const message = "Avoid if branches that repeat the body of the branch before them."

  const makeNoDuplicateIfBodiesFindings = (
    match: Match<
      typeof mutationQualityMatcherCatalog.noDuplicateIfBodiesMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) =>
    makeFindings(
      match.target,
      message,
      "These branches are pseudo-duplicates: the bodies are identical and only the " +
        "conditions differ. Combine them into a single branch: " +
        `if (${match.fact.combinedCondition}) { ... }.`,
      undefined
    )

  const noDuplicateIfBodies = makeBuiltinPolicy({
    name: "no-duplicate-if-bodies",
    matcher: mutationQualityMatcherCatalog.noDuplicateIfBodiesMatcher,
    guidance: Function.constant(makeNoDuplicateIfBodiesFindings),
    reported: true,
    stage: "program"
  })

  return noDuplicateIfBodies
}

export const noDuplicateIfBodies = makeNoDuplicateIfBodies()

export const branchStructurePolicies: ReadonlyArray<Policy> = Array.make(
  noNestedIfStatements,
  noNonNullAssertion,
  noDuplicateIfBodies
)

const makeNoDuplicateFunctionNames = () => {
  const makeNoDuplicateFunctionNamesFindings = (
    match: Match<
      typeof mutationQualityMatcherCatalog.noDuplicateFunctionNamesMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) =>
    makeFindings(
      match.target,
      `Avoid declaring the top-level function ${match.fact.functionName} with an identical signature in multiple files.`,
      `${match.fact.functionName} is declared with the same signature in ${match.fact.otherFiles}, which makes ` +
        "the copies semantic duplicates. Extract one shared implementation into a module " +
        "scoped to its domain and import it from every file that uses it. Name the module " +
        "after the concept it serves (ts.Node helpers belong in ts-node.ts), not a generic " +
        "lib.ts or utils.ts. Same-name functions over different signatures (user.ts#make, " +
        "account.ts#make) are module vocabulary, not duplicates.",
      undefined
    )

  const noDuplicateFunctionNames = makeBuiltinPolicy({
    name: "no-duplicate-function-names",
    matcher: mutationQualityMatcherCatalog.noDuplicateFunctionNamesMatcher,
    guidance: Function.constant(makeNoDuplicateFunctionNamesFindings),
    reported: true,
    stage: "program"
  })

  return noDuplicateFunctionNames
}

export const noDuplicateFunctionNames = makeNoDuplicateFunctionNames()

export const duplicateDeclarationPolicies: ReadonlyArray<Policy> =
  Array.make(noDuplicateFunctionNames)

const makeNoExplicitAnyReturn = () => {
  const message = "Avoid function return types that include any."

  const hint =
    "Declare a precise return type instead of any. If the value is unknown at a boundary, " +
    "use unknown and narrow before use."

  const noExplicitAnyReturn = makeBuiltinPolicy({
    name: "no-explicit-any-return",
    matcher: mutationQualityMatcherCatalog.noExplicitAnyReturnMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noExplicitAnyReturn
}

export const noExplicitAnyReturn = makeNoExplicitAnyReturn()

const makeNoMultipleBooleanOperators = () => {
  const message = "Avoid combining more than one boolean operator in a single expression."

  const hint =
    "Declare multiple constant variables instead of combining operators into a " +
    "single expression."

  const noMultipleBooleanOperators = makeBuiltinPolicy({
    name: "no-multiple-boolean-operators",
    matcher: mutationQualityMatcherCatalog.noMultipleBooleanOperatorsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noMultipleBooleanOperators
}

export const noMultipleBooleanOperators = makeNoMultipleBooleanOperators()

const makeNoInlineBooleanExpressions = () => {
  const message = "Avoid boolean operators inline in an if statement condition."

  const hint =
    "Extract the expression into a well-named const variable declaration above the if " +
    "statement and use that variable in the if condition."

  const noInlineBooleanExpressions = makeBuiltinPolicy({
    name: "no-inline-boolean-expressions",
    matcher: mutationQualityMatcherCatalog.noInlineBooleanExpressionsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noInlineBooleanExpressions
}

export const noInlineBooleanExpressions = makeNoInlineBooleanExpressions()

export const expressionPolicies: ReadonlyArray<Policy> = Array.make(
  noExplicitAnyReturn,
  noMultipleBooleanOperators,
  noInlineBooleanExpressions
)

const makeNoMutableArrayMethods = () => {
  const hint =
    "This is a sign that you're doing something fundamentally procedural when you should " +
    "be taking a more functional approach. Use Effect's Array module, such as " +
    "Array.append(), Array.map(), Array.filter(), Array.sort(), or spread syntax " +
    "instead of manipulating an array in place."

  const makeNoMutableArrayMethodsFindings = (
    match: Match<
      typeof mutationQualityMatcherCatalog.noMutableArrayMethodsMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) =>
    makeFindings(
      match.target,
      `Avoid mutating arrays with Array.prototype.${match.fact.methodName}().`,
      hint,
      undefined
    )

  const noMutableArrayMethods = makeBuiltinPolicy({
    name: "no-mutable-array-methods",
    matcher: mutationQualityMatcherCatalog.noMutableArrayMethodsMatcher,
    guidance: Function.constant(makeNoMutableArrayMethodsFindings),
    reported: true,
    stage: "program"
  })

  return noMutableArrayMethods
}

export const noMutableArrayMethods = makeNoMutableArrayMethods()

const makeNoMutableVariableDeclarations = () => {
  const hint =
    "Declare multiple const values to represent each state instead of mutating a single " +
    "variable, and use immutable values that are not reassigned. When the value must " +
    "genuinely evolve over time (a module-level counter, a cell shared across " +
    "closures), hold it in a Ref inside the Effect runtime instead of a let binding."

  const makeNoMutableVariableDeclarationsFindings = (
    match: Match<
      typeof mutationQualityMatcherCatalog.noMutableVariableDeclarationsMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) =>
    makeFindings(
      match.target,
      `Avoid declaring mutable variables with ${match.fact.kind}.`,
      hint,
      undefined
    )

  const noMutableVariableDeclarations = makeBuiltinPolicy({
    name: "no-mutable-variable-declarations",
    matcher: mutationQualityMatcherCatalog.noMutableVariableDeclarationsMatcher,
    guidance: Function.constant(makeNoMutableVariableDeclarationsFindings),
    reported: true,
    stage: "program"
  })

  return noMutableVariableDeclarations
}

export const noMutableVariableDeclarations = makeNoMutableVariableDeclarations()

const makeNoMutation = () => {
  const message = "Avoid mutating first-party data."

  const hint =
    "Match the fix to the scale of the state. Local data: derive a new value — " +
    "Array.replace or Array.modify for elements (both return Option — handle absence " +
    "with Option.getOrElse or Option.match; for a nonempty array's head or last element, " +
    "use Array.setHeadNonEmpty, Array.modifyHeadNonEmpty, Array.setLastNonEmpty, or " +
    "Array.modifyLastNonEmpty), " +
    "Struct.evolve for record fields, a fresh const for rebindings. Shared, long-lived " +
    "state (module-scope bindings, closure-captured cells, subscriber registries): do " +
    "not patch the assignment — move the state into the Effect runtime, holding it in " +
    "a Ref (SynchronizedRef under contention, PubSub for subscriber sets); when a " +
    "whole file manages state this way, invert the module into Effect behind a Layer " +
    "with one runtime entry at the boundary. Never mutate built-ins (prototypes, " +
    "globals). Mutating a third-party structure whose API contract requires assignment " +
    "(process.exitCode, a WebSocket handler slot, a React ref cell) is permitted."

  const noMutation = makeBuiltinPolicy({
    name: "no-mutation",
    matcher: mutationQualityMatcherCatalog.noMutationMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noMutation
}

export const noMutation = makeNoMutation()

const makeNoWeakMap = () => {
  const message = "Avoid WeakMap because it keeps mutable state outside Effect."

  const hint =
    "Store immutable state in an Effect Ref instead. Use SynchronizedRef when updates are " +
    "effectful, or SubscriptionRef when consumers need a stream of changes. Create the " +
    "reference inside an Effect or Layer instead of retaining a module-level WeakMap."

  const noWeakMap = makeBuiltinPolicy({
    name: "no-weak-map",
    matcher: mutationQualityMatcherCatalog.noWeakMapMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noWeakMap
}

export const noWeakMap = makeNoWeakMap()

export const mutationPolicies: ReadonlyArray<Policy> = Array.make(
  noMutableArrayMethods,
  noMutableVariableDeclarations,
  noMutation,
  noWeakMap
)

// Member order is pinned because concatenated categories define the public report block order.
export const expressionAndMutationPolicies: ReadonlyArray<Policy> = pipe(
  expressionPolicies,
  Array.appendAll(mutationPolicies),
  Array.appendAll(branchStructurePolicies),
  Array.appendAll(duplicateDeclarationPolicies)
)
