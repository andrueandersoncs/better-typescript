import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface SqlDriver {
  readonly select: (key: string) => Effect.Effect<string>
}

interface AuditTrail {
  readonly record: (key: string) => Effect.Effect<void>
}

const AuditTrail = Context.Service<AuditTrail>("AuditTrail")

export const Catalog = Context.Service<{
  readonly load: (key: string) => Effect.Effect<string, Error>
  readonly audit: (key: string) => Effect.Effect<void, Error>
}>("Catalog")

export const CatalogLive = Layer.effect(Catalog, Effect.gen(function*() {
  const sql = yield* Context.Service<SqlDriver>("SqlDriver")
  const auditTrail = yield* AuditTrail
  return {
    load: sql.select,
    audit: (key: string) => auditTrail.record(key)
  }
}))
