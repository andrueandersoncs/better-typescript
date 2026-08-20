import { noImmediateEffectSyncScanner } from "./noImmediateEffectSync.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoImmediateEffectSync = () => {
  const noImmediateEffectSync = makeRule("no-immediate-effect-sync")(noImmediateEffectSyncScanner)(
    fixedRuleMessage(
      "Avoid immediately running a locally bound Effect.sync.",
      "Run the synchronous action directly at this startup boundary, or retain the Effect only when it is deferred or composed into a larger workflow."
    )
  )

  return noImmediateEffectSync
}

export const noImmediateEffectSync = makeNoImmediateEffectSync()
