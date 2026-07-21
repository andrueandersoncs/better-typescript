import { Array, Function, Option, pipe } from "effect"
import type { Match as MatcherMatch, Target } from "@better-typescript/matchers/matcher/data"
import { emptyRefactorExampleSource } from "../example/example.js"
import {
  FindingSource,
  Policy,
  WorkspacePolicy,
  type Guidance,
  type PolicyDefinition,
  type PolicySeed,
  type WorkspaceGuidance,
  type WorkspacePolicySeed
} from "./data.js"

const asTypedMatch = <Fact>(match: MatcherMatch<unknown>): MatcherMatch<Fact> =>
  match as MatcherMatch<Fact>

const widenGuidance =
  <Fact>(guidance: Guidance<Fact>): Guidance<unknown> =>
  (context) =>
    Function.compose(asTypedMatch<Fact>, guidance(context))

const widenWorkspaceGuidance =
  <Fact>(guidance: WorkspaceGuidance<Fact>): WorkspaceGuidance<unknown> =>
  (context) =>
    Function.compose(asTypedMatch<Fact>, guidance(context))

const defaultReported = true
const defaultExamples = emptyRefactorExampleSource

const reportedFromDefinition = (definition: Pick<PolicyDefinition, "reported">) =>
  pipe(
    Option.fromNullishOr(definition.reported),
    Option.getOrElse(Function.constant(defaultReported))
  )

const examplesFromDefinition = (definition: Pick<PolicyDefinition, "examples">) =>
  pipe(
    Option.fromNullishOr(definition.examples),
    Option.getOrElse(Function.constant(defaultExamples))
  )

export const makePolicy = <Fact, Seed extends PolicySeed<Fact> = PolicySeed<Fact>>(
  definition: Seed
): Policy => {
  const name = definition.name
  const matcher = definition.matcher
  const guidance = widenGuidance(definition.guidance)
  const reported = reportedFromDefinition(definition)
  const examples = examplesFromDefinition(definition)

  return new Policy({ name, matcher, guidance, reported, examples })
}

export const makeSilentPolicy = <Fact, Seed extends PolicySeed<Fact> = PolicySeed<Fact>>(
  definition: Seed
): Policy => {
  const name = definition.name
  const matcher = definition.matcher
  const guidance = widenGuidance(definition.guidance)
  const examples = examplesFromDefinition(definition)

  return new Policy({ name, matcher, guidance, reported: false, examples })
}

export const makeWorkspacePolicy = <
  Fact,
  Seed extends WorkspacePolicySeed<Fact> = WorkspacePolicySeed<Fact>
>(
  definition: Seed
): WorkspacePolicy => {
  const name = definition.name
  const matcher = definition.matcher
  const guidance = widenWorkspaceGuidance(definition.guidance)
  const reported = reportedFromDefinition(definition)
  const examples = examplesFromDefinition(definition)

  return new WorkspacePolicy({ name, matcher, guidance, reported, examples })
}

export const makeSilentWorkspacePolicy = <
  Fact,
  Seed extends WorkspacePolicySeed<Fact> = WorkspacePolicySeed<Fact>
>(
  definition: Seed
): WorkspacePolicy => {
  const name = definition.name
  const matcher = definition.matcher
  const guidance = widenWorkspaceGuidance(definition.guidance)
  const examples = examplesFromDefinition(definition)

  return new WorkspacePolicy({ name, matcher, guidance, reported: false, examples })
}

export const definePolicy = makePolicy
export const defineSilentPolicy = makeSilentPolicy
export const defineWorkspacePolicy = makeWorkspacePolicy
export const defineSilentWorkspacePolicy = makeSilentWorkspacePolicy

export const makeFindings = (
  target: Target,
  message: string,
  hint: string,
  data: unknown
): ReadonlyArray<FindingSource> =>
  pipe(new FindingSource({ target, message, hint, data }), Array.of)

export const oneFinding = makeFindings
