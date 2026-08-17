import { Array } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/match"
import { makeBuiltinPolicy } from "@better-typescript/guidance/makeBuiltinPolicy"
import { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import { WorkspaceMatcher } from "@better-typescript/matchers/matcher/workspaceMatcher"

makeBuiltinPolicy({
  name: "mismatched-program-facts",
  // @ts-expect-error program matcher and guidance facts must match
  matcher: new Matcher<string>({ plan: () => Array.empty(), compilerOptions: {} }),
  guidance: () => (_match: Match<number>) => Array.empty(),
  reported: true,
  stage: "program"
})

makeBuiltinPolicy({
  name: "mismatched-workspace-facts",
  // @ts-expect-error workspace matcher and guidance facts must match
  matcher: new WorkspaceMatcher<string>({ match: () => Array.empty() }),
  guidance: () => (_match: Match<number>) => Array.empty(),
  reported: true,
  stage: "workspace"
})
