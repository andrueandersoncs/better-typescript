import { noTryCatchScanner } from "./noTryCatch.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoTryCatch = () => {
  const message = "Avoid try/catch for error handling."

  const hint =
    "Model effectful code that can fail as an Effect and declare its failures as explicit " +
    'Schema.TaggedErrorClass classes, for example: class FetchError extends Schema.TaggedErrorClass<FetchError>()("FetchError", {}) {}. ' +
    "Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catch) instead of catching inside a try block."

  const noTryCatch = makeRule("no-try-catch")(noTryCatchScanner)(fixedRuleMessage(message, hint))

  return noTryCatch
}

export const noTryCatch = makeNoTryCatch()
