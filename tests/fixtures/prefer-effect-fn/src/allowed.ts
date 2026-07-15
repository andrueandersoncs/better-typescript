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

type Service = {
  readonly prefix: string
}

declare const service: Service

export const loadName = Effect.fn("loadName")(
  { self: service },
  function* (this: Service, id: string) {
    return `${this.prefix}:${id}`
  }
)
