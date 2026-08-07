import { Function, Option, pipe } from "effect"
import type { PolicyDefinition } from "./policyDefinition.js"

const defaultReported = true

export const reportedFromDefinition = (definition: Pick<PolicyDefinition, "reported">) =>
  pipe(
    Option.fromNullishOr(definition.reported),
    Option.getOrElse(Function.constant(defaultReported))
  )
