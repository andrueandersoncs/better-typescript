import { Array, Schema } from "effect"

const falseCommandKind = Schema.Literal("false-command")
const hiddenCommandKind = Schema.Literal("hidden-command")

// RequireCommandFalseCommandFact exists because its fields form one stable data contract used by the linter.
export const RequireCommandFalseCommandFact = Schema.Struct({
  kind: falseCommandKind,
  nameText: Schema.String,
  operation: Schema.String
})

export interface RequireCommandFalseCommandFact extends Schema.Schema.Type<
  typeof RequireCommandFalseCommandFact
> {}

// RequireCommandHiddenCommandFact exists because its fields form one stable data contract used by the linter.
export const RequireCommandHiddenCommandFact = Schema.Struct({
  kind: hiddenCommandKind,
  nameText: Schema.String
})

export interface RequireCommandHiddenCommandFact extends Schema.Schema.Type<
  typeof RequireCommandHiddenCommandFact
> {}

const commandFactMembers = Array.make(
  RequireCommandFalseCommandFact,
  RequireCommandHiddenCommandFact
)

// RequireCommandNameConsistencyFact unions command claims because false and hidden differ.
export const RequireCommandNameConsistencyFact = Schema.Union(commandFactMembers)

export type RequireCommandNameConsistencyFact = Schema.Schema.Type<
  typeof RequireCommandNameConsistencyFact
>
