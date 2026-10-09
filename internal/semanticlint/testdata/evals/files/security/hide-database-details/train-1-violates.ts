import { HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { SqlError } from "@effect/sql"
import { AccountRepo } from "./AccountRepo"

export interface UpdateEmailBody {
  readonly accountId: string
  readonly email: string
}

export const updateEmail = (body: UpdateEmailBody) =>
  Effect.gen(function* () {
    const repo = yield* AccountRepo
    yield* repo.setEmail(body.accountId, body.email)
    return yield* HttpServerResponse.json({ ok: true })
  }).pipe(
    Effect.catchTag("SqlError", (e: SqlError) =>
      Effect.gen(function* () {
        yield* Effect.logError("setEmail failed", e)
        const duplicate = String(e.cause).includes("accounts_email_key")
        return yield* HttpServerResponse.json(
          { error: duplicate ? `Email already used (constraint accounts_email_key): ${e.message}` : e.message },
          { status: duplicate ? 409 : 500 }
        )
      })
    )
  )
