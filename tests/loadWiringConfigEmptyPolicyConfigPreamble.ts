const emptyPolicyConfigPreamble = [
  'import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"',
  'import { makeSilentPolicy } from "@better-typescript/core/engine/policy/makeSilentPolicy"',
  'import { fileMatcher } from "@better-typescript/matchers/matcher/fileMatcher"',
  'import { makeMatcherFromSubscriptions } from "@better-typescript/matchers/matcher/makeMatcherFromSubscriptions"',
  'import { makeFileMatch } from "@better-typescript/matchers/builtins/exportSurface"',
  'import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example/examplesFromDefinition"',
  'import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"',
  'import { Effect } from "effect"',
  "",
  "const emptyMatcher = makeMatcherFromSubscriptions(() => [])",
  "const emptyGuidance = () => () => []",
  "const makeEmptyPolicy = (name, reported = true) =>",
  "  reported",
  "    ? makePolicy({ name, matcher: emptyMatcher, guidance: emptyGuidance, examples: emptyRefactorExampleSource })",
  "    : makeSilentPolicy({ name, matcher: emptyMatcher, guidance: emptyGuidance, examples: emptyRefactorExampleSource })",
  ""
]

export const configSource = (...lines: ReadonlyArray<string>) =>
  [...emptyPolicyConfigPreamble, ...lines, ""].join("\n")
