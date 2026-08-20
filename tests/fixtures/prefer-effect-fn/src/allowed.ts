import { Effect } from "effect"

export const fetchUser = Effect.fn("fetchUser")(function* (id: number) {
  return id
})
export const ready = () => Effect.succeed(1)
export const increment = (n: number) => n + 1
export const loadAsync = (id: number) => Promise.resolve(id)
export function legacyFetch(id: number) {
  return Effect.succeed(id)
}

const createdButNotReturned = () => {
  const operation = Effect.gen(function* () {
    return "nested"
  })

  return Effect.succeed(operation)
}

const unrelated = {
  gen: (value: number) => value
}

export const lookalike = () => unrelated.gen(1)

export async function asyncWrapper() {
  return Effect.gen(function* () {
    return "promise"
  })
}

export function* generatorWrapper() {
  return Effect.gen(function* () {
    return "generator"
  })
}

Effect.gen(function* () {
  return "top level"
})

const prebuilt = Effect.gen(function* () {
  return "prebuilt"
})

export const returnsPrebuilt = () => prebuilt

declare const typedLookalike: typeof Effect.gen

export const sameTypedLookalike = () =>
  typedLookalike(function* () {
    return "typed lookalike"
  })

const dynamicMember: "gen" = "gen"

export const dynamicAccess = () =>
  Effect[dynamicMember](function* () {
    return "dynamic"
  })

let mutableGen = Effect.gen
mutableGen = Effect.gen

export const mutableAlias = () =>
  mutableGen(function* () {
    return "mutable"
  })

void createdButNotReturned
