import { Context, Effect, Layer } from "effect"

export class Database extends Context.Service<
  Database,
  { readonly query: Effect.Effect<string> }
>()("app/Database") {}

export class Logger extends Context.Service<
  Logger,
  { readonly log: (message: string) => Effect.Effect<void> }
>()("app/Logger") {}

export class Repository extends Context.Service<
  Repository,
  { readonly load: Effect.Effect<string> }
>()("app/Repository") {}

export const database = Layer.succeed(Database, {
  query: Effect.succeed("result")
})

export const logger = Layer.succeed(Logger, {
  log: () => Effect.void
})

export const repository = Layer.effect(
  Repository,
  Effect.gen(function* () {
    const service = yield* Database

    return Repository.of({ load: service.query })
  })
)
