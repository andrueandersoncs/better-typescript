import { Data, Schema } from "effect"
import {
  Matcher,
  WorkspaceMatcher,
  type Match,
  type Target,
  type WorkspaceContext
} from "@better-typescript/matchers/matcher/data"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { refactorExampleSourceSchema, type RefactorExampleSource } from "../example/data.js"

// FindingSource is pre-location guidance output because matchers must stay prose-free.
export class FindingSource extends Data.Class<{
  readonly target: Target
  readonly message: string
  readonly hint: string
  readonly data: unknown
}> {}

export type Guidance<Fact> = (
  context: ProgramContext
) => (match: Match<Fact>) => ReadonlyArray<FindingSource>

export type WorkspaceGuidance<Fact> = (
  context: WorkspaceContext
) => (match: Match<Fact>) => ReadonlyArray<FindingSource>

// Policy is the named matching-plus-guidance unit because report owns one ordered shape.
export class Policy extends Data.Class<{
  readonly name: string
  readonly matcher: Matcher
  readonly guidance: Guidance<unknown>
  readonly reported: boolean
  readonly examples: RefactorExampleSource
}> {}

// WorkspacePolicy is distinct because workspace matching runs after all programs.
export class WorkspacePolicy extends Data.Class<{
  readonly name: string
  readonly matcher: WorkspaceMatcher
  readonly guidance: WorkspaceGuidance<unknown>
  readonly reported: boolean
  readonly examples: RefactorExampleSource
}> {}

const matcherSchema = Schema.instanceOf(Matcher)
const workspaceMatcherSchema = Schema.instanceOf(WorkspaceMatcher)
const guidanceSchema = Schema.Any
const optionalReported = Schema.optionalKey(Schema.Boolean)
const optionalExamples = Schema.optionalKey(refactorExampleSourceSchema)

// PolicyDefinition is the complete authoring record because makePolicy fills defaults first.
export const PolicyDefinition = Schema.Struct({
  name: Schema.String,
  matcher: matcherSchema,
  guidance: guidanceSchema,
  reported: optionalReported,
  examples: optionalExamples
})

export interface PolicyDefinition extends Schema.Schema.Type<typeof PolicyDefinition> {}

// WorkspacePolicyDefinition is the complete workspace authoring record because defaults land first.
export const WorkspacePolicyDefinition = Schema.Struct({
  name: Schema.String,
  matcher: workspaceMatcherSchema,
  guidance: guidanceSchema,
  reported: optionalReported,
  examples: optionalExamples
})

export interface WorkspacePolicyDefinition extends Schema.Schema.Type<
  typeof WorkspacePolicyDefinition
> {}

// PolicySeed is the typed authoring input because guidance specializes PolicyDefinition.guidance.
export type PolicySeed<Fact> = Omit<PolicyDefinition, "guidance"> & {
  readonly guidance: Guidance<Fact>
}

// WorkspacePolicySeed is the typed workspace authoring input because guidance is specialized.
export type WorkspacePolicySeed<Fact> = Omit<WorkspacePolicyDefinition, "guidance"> & {
  readonly guidance: WorkspaceGuidance<Fact>
}
