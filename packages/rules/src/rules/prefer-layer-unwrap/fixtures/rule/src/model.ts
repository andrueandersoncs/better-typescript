import { Context, Effect, Layer } from "effect"

export class Database extends Context.Service<Database, {
  readonly query: Effect.Effect<string>
}>()("Database") {}

export class Repository extends Context.Service<Repository, {
  readonly load: Effect.Effect<string>
}>()("Repository") {}

export class Worker extends Context.Service<Worker, {
  readonly run: Effect.Effect<void>
}>()("Worker") {}

export class Selected extends Context.Service<Selected, Layer.Layer<Database>>()("Selected") {}

export class SelectedComposite extends Context.Service<
  SelectedComposite,
  Layer.Layer<Database | Repository, never, Database>
>()("SelectedComposite") {}

export const database = Layer.succeed(Database, Database.of({ query: Effect.succeed("value") }))

export const repository = Layer.effect(
  Repository,
  Effect.gen(function*() {
    const databaseService = yield* Database
    return Repository.of({ load: databaseService.query })
  })
)

export const selected = Effect.succeed(database)
