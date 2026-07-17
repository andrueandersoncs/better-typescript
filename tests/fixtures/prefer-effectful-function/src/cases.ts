import { Effect } from "effect"
import { Effect as Fx } from "effect"

const readOrLoad = Effect.succeed(["loaded"] as const)

export const loadExamples = (): ReadonlyArray<string> => // ~detect 14
  Effect.runSync(readOrLoad)

export const loadParenthesized = () => // ~detect 14
  (Effect.runSync(Effect.succeed("loaded")))

export const loadBlock = () => { // ~detect 14
  return Effect.runSync(Effect.succeed("loaded"))
}

export function loadDeclaration(): string { // ~detect 17
  return Fx.runSync(Effect.succeed("loaded"))
}
