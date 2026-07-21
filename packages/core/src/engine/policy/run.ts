import { Array, Option, Struct, flow } from "effect"
import {
  Match as MatcherMatch,
  type WorkspaceContext
} from "@better-typescript/matchers/matcher/data"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import {
  compilerOptionsForMatchers,
  runMatchers,
  runWorkspaceMatchers,
  type MatcherFilePredicate
} from "@better-typescript/matchers/matcher"
import { Detection } from "../location/data.js"
import { FindingSource, Policy, WorkspacePolicy } from "./data.js"
import { locateTarget, locateWorkspaceTarget } from "./locate.js"

const policyMatcher = Struct.get<Policy, "matcher">("matcher")
const workspacePolicyMatcher = Struct.get<WorkspacePolicy, "matcher">("matcher")
const emptyDetections = Array.empty<Detection>()

export const makeDetection = (context: ProgramContext) => (source: FindingSource) => {
  const locate = locateTarget(context)
  const location = locate(source.target)

  return Detection.make({
    location,
    message: source.message,
    hint: source.hint,
    data: source.data
  })
}

export const makeWorkspaceDetection = (context: WorkspaceContext) => (source: FindingSource) => {
  const locate = locateWorkspaceTarget(context)
  const location = locate(source.target)

  return Detection.make({
    location,
    message: source.message,
    hint: source.hint,
    data: source.data
  })
}

export const compilerOptionsForPolicies = flow(Array.map(policyMatcher), compilerOptionsForMatchers)

const detectionsForMatch =
  (toDetection: (source: FindingSource) => Detection) =>
  (guidanceForContext: (match: MatcherMatch<unknown>) => ReadonlyArray<FindingSource>) =>
  (match: MatcherMatch<unknown>) => {
    const sources = guidanceForContext(match)

    return Array.map(sources, toDetection)
  }

const detectionsForPolicyGuidance =
  <Context>(
    context: Context,
    toDetection: (source: FindingSource) => Detection,
    guidance: (context: Context) => (match: MatcherMatch<unknown>) => ReadonlyArray<FindingSource>
  ) =>
  (matches: ReadonlyArray<MatcherMatch<unknown>>) => {
    const guidanceForContext = guidance(context)
    const toDetections = detectionsForMatch(toDetection)(guidanceForContext)

    return Array.flatMap(matches, toDetections)
  }

type PolicyGuidance<Context> = (
  context: Context
) => (match: MatcherMatch<unknown>) => ReadonlyArray<FindingSource>

const detectionsForPolicyMatches =
  <Context>(context: Context, toDetection: (source: FindingSource) => Detection) =>
  (policies: ReadonlyArray<Policy | WorkspacePolicy>) =>
  (matchesByPolicy: ReadonlyArray<ReadonlyArray<MatcherMatch<unknown>>>) =>
    Array.map(matchesByPolicy, (matches, policyIndex) => {
      const maybePolicy = Array.get(policies, policyIndex)

      if (Option.isNone(maybePolicy)) {
        return emptyDetections
      }

      const policy = maybePolicy.value
      const guidance = policy.guidance as PolicyGuidance<Context>
      const detectionsForPolicy = detectionsForPolicyGuidance(context, toDetection, guidance)

      return detectionsForPolicy(matches)
    })

export const toPolicies =
  (policies: ReadonlyArray<Policy>) =>
  (includesSourceFile: MatcherFilePredicate) =>
  (context: ProgramContext): ReadonlyArray<ReadonlyArray<Detection>> => {
    const matchers = Array.map(policies, policyMatcher)
    const runConfiguredMatchers = runMatchers(matchers)(includesSourceFile)
    const matchesByPolicy = runConfiguredMatchers(context)
    const toDetection = makeDetection(context)
    const toDetections = detectionsForPolicyMatches(context, toDetection)(policies)

    return toDetections(matchesByPolicy)
  }

export const toWorkspacePolicies =
  (policies: ReadonlyArray<WorkspacePolicy>) =>
  (context: WorkspaceContext): ReadonlyArray<ReadonlyArray<Detection>> => {
    const matchers = Array.map(policies, workspacePolicyMatcher)
    const matchesByPolicy = runWorkspaceMatchers(matchers)(context)
    const toDetection = makeWorkspaceDetection(context)
    const toDetections = detectionsForPolicyMatches(context, toDetection)(policies)

    return toDetections(matchesByPolicy)
  }

export const runPolicies = toPolicies
export const runWorkspacePolicies = toWorkspacePolicies
