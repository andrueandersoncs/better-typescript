import { noMutationScanner } from "./noMutation.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoMutation = () => {
  const message = "Avoid mutating first-party data."

  const hint =
    "Match the fix to the scale of the state. Local data: derive a new value — " +
    "Array.replace or Array.modify for elements (both return Option — handle absence " +
    "with Option.getOrElse or Option.match; for a nonempty array's head or last element, " +
    "use Array.setHeadNonEmpty, Array.modifyHeadNonEmpty, Array.setLastNonEmpty, or " +
    "Array.modifyLastNonEmpty), " +
    "Struct.evolve for record fields, a fresh const for rebindings. Shared, long-lived " +
    "state (module-scope bindings, closure-captured cells, subscriber registries): do " +
    "not patch the assignment — move the state into the Effect runtime, holding it in " +
    "a Ref (SynchronizedRef under contention, PubSub for subscriber sets); when a " +
    "whole file manages state this way, invert the module into Effect behind a Layer " +
    "with one runtime entry at the boundary. Never mutate built-ins (prototypes, " +
    "globals). Mutating a third-party structure whose API contract requires assignment " +
    "(process.exitCode, a WebSocket handler slot, a React ref cell) is permitted."

  const noMutation = makeRule("no-mutation")(noMutationScanner)(fixedRuleMessage(message, hint))

  return noMutation
}

export const noMutation = makeNoMutation()
