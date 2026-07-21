import { Array, Effect, HashSet, Struct, flow } from "effect"
import { strictEqual } from "../equivalence.js"
import { DuplicateNameState, DuplicatePolicyNamesError, type WiringPolicy } from "./data.js"

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
  const name = policy.name
  const alreadySeen = HashSet.has(state.seen, name)
  const alreadyCollision = HashSet.has(state.collisions, name)

  if (!alreadySeen) {
    const seen = HashSet.add(state.seen, name)

    return new DuplicateNameState({
      seen,
      collisions: state.collisions,
      names: state.names
    })
  }

  if (alreadyCollision) {
    return state
  }

  const collisions = HashSet.add(state.collisions, name)
  const names = Array.append(state.names, name)

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
