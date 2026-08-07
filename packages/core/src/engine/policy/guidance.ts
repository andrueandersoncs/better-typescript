import type { Match } from "@better-typescript/matchers/matcher/match"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import type { FindingSource } from "./findingSource.js"

export type Guidance<Fact> = (
  context: ProgramContext
) => (match: Match<Fact>) => ReadonlyArray<FindingSource>
