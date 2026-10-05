import * as Fx from "effect/Effect"
import * as Schedule from "effect/Schedule"

type SessionFault =
  | { readonly _tag: "NetworkIssue" }
  | { readonly _tag: "InvalidCredential" }

const refreshSession = (): Fx.Effect<string, SessionFault> =>
  Fx.fail({ _tag: "NetworkIssue" })

export const renewSession = () => {
  const plan = Schedule.upTo(Schedule.spaced("150 millis"), { times: 3, duration: "3 seconds" })
  return refreshSession().pipe(
    Fx.retry({ schedule: plan })
  )
}
