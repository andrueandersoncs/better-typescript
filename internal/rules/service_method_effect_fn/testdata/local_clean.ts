import { Effect } from "effect"
interface Loader { load(id: string): Effect.Effect<string> }
const named = Effect.fn("named")((id: string) => Effect.succeed(id))
const mapped = Effect.succeed(1).pipe(Effect.flatMap((value) => Effect.succeed(value + 1)))
function sometimes(id: string) { if (id) { return Effect.succeed(id) } return 0 }
const plain = (id: string) => id.length
function* generator() { yield 1 }
export const used: Array<unknown> = [named, mapped, sometimes, plain, generator]
export type { Loader }
export const task = Effect.succeed(1)
export function exportedSometimes(id: string) { if (id) { return Effect.succeed(id) } return 0 }
let reassigned = (id: string) => Effect.succeed(id)
reassigned = (id: string) => Effect.succeed(id + "!")
export { reassigned }
