import { Schema } from "effect"

// PreferCurriedDataLastFunctionsFact is empty payload because guidance and matchers share identity.
export const PreferCurriedDataLastFunctionsFact = Schema.Struct({})

export interface PreferCurriedDataLastFunctionsFact extends Schema.Schema.Type<
  typeof PreferCurriedDataLastFunctionsFact
> {}
