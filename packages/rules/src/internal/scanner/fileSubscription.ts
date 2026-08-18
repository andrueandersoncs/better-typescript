import { Match } from "./match.js"
import type { MatchContext } from "./matchContext.js"
import { Data } from "effect"

export type FileHandler<Fact> = (context: MatchContext) => ReadonlyArray<Match<Fact>>

// FileSubscription carries a file scanner because it runs once per included source file.
export class FileSubscription<Fact = unknown> extends Data.Class<{
  readonly handler: FileHandler<Fact>
}> {}
