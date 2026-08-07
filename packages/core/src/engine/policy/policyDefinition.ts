import { Schema } from "effect"
import { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import { optionalExamples } from "./optionalExamples.js"
import { optionalReported } from "./optionalReported.js"

const matcherSchema = Schema.instanceOf(Matcher)

// PolicyDefinition is the complete authoring record because makePolicy fills defaults first.
export const PolicyDefinition = Schema.Struct({
  name: Schema.String,
  matcher: matcherSchema,
  guidance: Schema.Any,
  reported: optionalReported,
  examples: optionalExamples
})

export interface PolicyDefinition extends Schema.Schema.Type<typeof PolicyDefinition> {}
