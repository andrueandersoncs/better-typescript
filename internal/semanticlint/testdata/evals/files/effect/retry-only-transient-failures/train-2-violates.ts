import { Effect, Schedule } from "effect"
import { HttpClient, HttpClientError } from "@effect/platform"

export interface Profile {
  readonly id: string
  readonly displayName: string
  readonly roles: ReadonlyArray<string>
}

const transientStatuses = new Set([408, 429, 502, 503, 504])

const isTransient = (error: HttpClientError.HttpClientError): boolean => {
  if (error._tag === "RequestError") return error.reason === "Transport"
  const status = error.response.status
  return transientStatuses.has(status) || status === 401 || status === 403
}

const retryPolicy = Schedule.jittered(Schedule.exponential("100 millis")).pipe(
  Schedule.compose(Schedule.recurs(3)),
)

export const loadProfile = (accountId: string) =>
  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk)
    const response = yield* client.get(`/api/accounts/${accountId}/profile`).pipe(
      Effect.retry({ schedule: retryPolicy, while: isTransient }),
    )
    const body = (yield* response.json) as Profile
    return body
  })

export const loadProfiles = (ids: ReadonlyArray<string>) =>
  Effect.forEach(ids, loadProfile, { concurrency: 8 })
