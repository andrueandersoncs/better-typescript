import { Data, Effect, Schedule } from "effect"

export class ProviderTimeout extends Data.TaggedError("ProviderTimeout")<{}> {}
export class ProviderDown extends Data.TaggedError("ProviderDown")<{
  readonly status: number
}> {}

export interface Authorization {
  readonly id: string
  readonly approved: boolean
}

declare const callProvider: (
  orderId: string,
  amountCents: number,
) => Effect.Effect<Authorization, ProviderDown>

const attempts = Schedule.spaced("250 millis").pipe(Schedule.intersect(Schedule.recurs(2)))

/**
 * Authorizes a card payment. The customer is waiting on the checkout page,
 * so the whole authorization, including every retry, is capped at 3 seconds.
 */
export const authorize = (orderId: string, amountCents: number) =>
  callProvider(orderId, amountCents).pipe(
    Effect.retry(attempts),
    Effect.timeoutFail({ duration: "3 seconds", onTimeout: () => new ProviderTimeout() }),
  )

export const authorizeOrFallback = (orderId: string, amountCents: number) =>
  authorize(orderId, amountCents).pipe(
    Effect.catchTag("ProviderTimeout", () =>
      Effect.succeed<Authorization>({ id: `pending-${orderId}`, approved: false }),
    ),
  )
