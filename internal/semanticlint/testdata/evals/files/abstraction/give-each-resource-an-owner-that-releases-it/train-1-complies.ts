import { Context, Effect, Layer } from "effect"
import { Pool, type PoolConfig } from "pg"

export class DbConfig extends Context.Tag("DbConfig")<DbConfig, PoolConfig>() {}

export class DbPool extends Context.Tag("DbPool")<DbPool, Pool>() {}

export class PoolError {
  readonly _tag = "PoolError"
  constructor(readonly cause: unknown) {}
}

export const DbPoolLive = Layer.scoped(
  DbPool,
  Effect.gen(function* () {
    const config = yield* DbConfig
    return yield* Effect.acquireRelease(
      Effect.try({ try: () => new Pool(config), catch: (e) => new PoolError(e) }),
      (pool) => Effect.promise(() => pool.end())
    )
  })
)

export const query = <A>(sql: string, params: ReadonlyArray<unknown> = []) =>
  Effect.gen(function* () {
    const pool = yield* DbPool
    return yield* Effect.tryPromise({
      try: () => pool.query(sql, [...params]).then((r) => r.rows as Array<A>),
      catch: (e) => new PoolError(e)
    })
  })
