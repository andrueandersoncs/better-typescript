import { Duration, Effect, Schedule } from "effect"
import { HttpBody, HttpClient } from "@effect/platform"

export interface WebhookConfig {
  readonly url: string
  readonly maxAttempts: number
  readonly backoffMillis: number
}

export const defaultWebhookConfig: WebhookConfig = {
  url: "https://hooks.example.com/ingest",
  maxAttempts: 5,
  backoffMillis: 250,
}

export const deliverWebhook = (config: WebhookConfig, payload: unknown) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const policy = Schedule.exponential(Duration.millis(config.backoffMillis)).pipe(
      Schedule.intersect(Schedule.recurs(config.maxAttempts - 1)),
    )

    return yield* client
      .post(config.url, { body: HttpBody.unsafeJson(payload) })
      .pipe(Effect.retry(policy))
  })
