import * as Fx from "effect/Effect"
import * as Schedule from "effect/Schedule"

type RemoteFault =
  | { readonly _tag: "NetworkIssue" }
  | { readonly _tag: "MalformedReply" }

const fetchSnapshot = (url: string): Fx.Effect<string, RemoteFault> =>
  Fx.tryPromise({
    try: () => fetch(url).then((response) => response.text()),
    catch: () => ({ _tag: "NetworkIssue" as const })
  })

export const readSnapshot = (url: string) => {
  const plan = Schedule.upTo(Schedule.exponential("100 millis"), { times: 3, duration: "4 seconds" })
  return fetchSnapshot(url).pipe(
    Fx.timeout("1 second"),
    Fx.retry({
      schedule: plan,
      while: (error) => error._tag === "NetworkIssue"
    })
  )
}
