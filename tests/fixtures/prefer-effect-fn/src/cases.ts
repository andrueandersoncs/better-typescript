import { Effect } from "effect"

export const fetchUser = (id: number) => Effect.succeed(id)
export const getCount = (id: number): Effect.Effect<number> =>
  Effect.succeed(id)
export const compute = (n: number) => // ~detect 14
  Effect.gen(function* () {
    return n * 2
  })
export const load = function (id: number) {
  return Effect.succeed(id)
}
export const failWith = (code: number, message: string) =>
  Effect.fail({ code, message })

type Service = {
  readonly prefix: string
}

declare const service: Service

export const loadName = (id: string) => // ~detect 14
  Effect.gen({ self: service }, function* (this: Service) {
    return `${this.prefix}:${id}`
  })

const self = service

export const loadShortName = (id: string) => // ~detect 14
  Effect.gen({ self }, function* (this: Service) {
    return `${this.prefix}:${id}`
  })
