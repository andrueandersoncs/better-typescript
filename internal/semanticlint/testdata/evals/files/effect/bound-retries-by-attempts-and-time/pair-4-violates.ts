import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"

type Invoice = {
  readonly reference: string
  readonly amount: number
}

type Billing = {
  readonly submit: (invoice: Invoice) => Effect.Effect<void, { readonly _tag: "NetworkIssue" }>
}

export const sendInvoice = (billing: Billing, invoice: Invoice) => {
  const plan = Schedule.upTo(Schedule.spaced("250 millis"), { times: 2, duration: "2 seconds" })
  return billing.submit(invoice).pipe(
    Effect.retry({
      schedule: plan,
      while: (error) => error._tag === "NetworkIssue"
    }),
    Effect.timeout("2 seconds")
  )
}
