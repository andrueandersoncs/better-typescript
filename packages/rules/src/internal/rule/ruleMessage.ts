import { Schema } from "effect"
import type { Match } from "../scanner/match.js"
import type { ProgramContext } from "../sources/data.js"

// RuleMessageCopy is shared because every scanner and rule catalog emits one validated message contract.
export const RuleMessageCopy = Schema.Struct({
  message: Schema.String,
  hint: Schema.String
})

export interface RuleMessageCopy extends Schema.Schema.Type<typeof RuleMessageCopy> {}

export type RuleMessage<Fact> = (context: ProgramContext) => (match: Match<Fact>) => RuleMessageCopy
