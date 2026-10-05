import * as Effect from "effect/Effect"

type Notice = {
  readonly subject: string
  readonly recipients: ReadonlyArray<string>
}

type Delivery = {
  readonly id: string
  readonly recipientCount: number
}

export const scheduleNotice = (notice: Notice): Effect.Effect<Delivery> =>
  Effect.succeed({
    id: crypto.randomUUID(),
    recipientCount: notice.recipients.length
  })
