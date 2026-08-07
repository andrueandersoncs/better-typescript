import { Array, Effect, HashSet, Schema, Struct, flow } from "effect"
import { strictEqual } from "../equivalence/strictEqual.js"
import { DuplicateNameState } from "./duplicateNameState.js"
import type { WiringPolicy } from "./wiringPolicy.js"

const duplicateNameArray = Schema.Array(Schema.String)

// DuplicatePolicyNamesError carries structured collision names because CLI handling needs them.
export class DuplicatePolicyNamesError extends Schema.TaggedErrorClass<DuplicatePolicyNamesError>()(
  "DuplicatePolicyNamesError",
  {
    names: duplicateNameArray
  }
) {
  get message(): string {
    return `Duplicate policy names: ${Array.join(this.names, ", ")}`
  }
}

const emptyDuplicateNamesSeen = HashSet.empty<string>()
const emptyDuplicateNameCollisions = HashSet.empty<string>()
const emptyDuplicateNames = Array.empty<string>()

const emptyDuplicateNameState = new DuplicateNameState({
  seen: emptyDuplicateNamesSeen,
  collisions: emptyDuplicateNameCollisions,
  names: emptyDuplicateNames
})

const failDuplicatePolicyNames = (names: ReadonlyArray<string>) => {
  const error = new DuplicatePolicyNamesError({ names })
  const failure = Effect.fail(error)

  return Effect.runSync(failure)
}

const addDuplicateName = (state: DuplicateNameState, policy: WiringPolicy) => {
  const alreadySeen = HashSet.has(state.seen, policy.name)
  const alreadyCollision = HashSet.has(state.collisions, policy.name)

  if (!alreadySeen) {
    const seen = HashSet.add(state.seen, policy.name)

    return new DuplicateNameState({
      seen,
      collisions: state.collisions,
      names: state.names
    })
  }

  if (alreadyCollision) {
    return state
  }

  const collisions = HashSet.add(state.collisions, policy.name)
  const names = Array.append(state.names, policy.name)

  return new DuplicateNameState({
    seen: state.seen,
    collisions,
    names
  })
}

const isEmptyNames = flow(
  Struct.get<DuplicateNameState, "names">("names"),
  Array.length,
  strictEqual(0)
)

export const validatePolicyNames = <A>(policies: ReadonlyArray<WiringPolicy>, value: A): A => {
  const state = Array.reduce(policies, emptyDuplicateNameState, addDuplicateName)

  return isEmptyNames(state) ? value : failDuplicatePolicyNames(state.names)
}
