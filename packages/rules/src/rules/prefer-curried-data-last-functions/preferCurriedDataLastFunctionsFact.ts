import { Schema } from "effect"

// PreferCurriedDataLastFunctionsFact exists because its fields form one stable data contract used by the linter.
export const PreferCurriedDataLastFunctionsFact = Schema.Struct({})

export interface PreferCurriedDataLastFunctionsFact extends Schema.Schema.Type<
  typeof PreferCurriedDataLastFunctionsFact
> {}
