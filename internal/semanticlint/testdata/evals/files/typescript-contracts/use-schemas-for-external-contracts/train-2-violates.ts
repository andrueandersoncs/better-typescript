import { Effect, Schema } from "effect"
import type { Message } from "@aws-sdk/client-sqs"
import { Mailer } from "../Mailer"

const UserSignedUpSchema = Schema.Struct({
  userId: Schema.String,
  email: Schema.String,
  locale: Schema.String,
  plan: Schema.Literal("free", "pro", "team"),
})

type UserSignedUp = {
  userId: string
  email: string
  locale: string
  plan: "free" | "pro" | "team"
}

interface WelcomeTemplate {
  readonly templateId: string
  readonly subjectKey: string
}

const templateFor = (event: UserSignedUp): WelcomeTemplate =>
  event.plan === "free"
    ? { templateId: "welcome-free", subjectKey: "welcome.subject" }
    : { templateId: "welcome-paid", subjectKey: "welcome.subject.paid" }

const decode = Schema.decodeUnknown(Schema.parseJson(UserSignedUpSchema))

export const handleUserSignedUp = (message: Message) =>
  Effect.gen(function* () {
    const event: UserSignedUp = yield* decode(message.Body ?? "")
    const mailer = yield* Mailer
    const template = templateFor(event)
    yield* mailer.send({
      to: event.email,
      locale: event.locale,
      templateId: template.templateId,
      subjectKey: template.subjectKey,
      data: { userId: event.userId },
    })
  })
