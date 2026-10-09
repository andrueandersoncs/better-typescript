import { Effect } from "effect"
import { MailTransport } from "./transport.js"

export interface Recipient {
  readonly email: string
  readonly displayName: string
}

export interface Notice {
  readonly subject: string
  readonly body: string
}

const render = (recipient: Recipient, notice: Notice) => ({
  to: recipient.email,
  subject: notice.subject,
  text: `Hi ${recipient.displayName},\n\n${notice.body}`
})

export const sendTransactionalNotice = (recipient: Recipient, notice: Notice) =>
  Effect.gen(function* () {
    const transport = yield* MailTransport
    yield* transport.deliver(render(recipient, notice))
    return { sent: true as const }
  })

export const sendMarketingNotice = (recipient: Recipient, notice: Notice) =>
  Effect.gen(function* () {
    const transport = yield* MailTransport
    const unsubscribed = yield* transport.isUnsubscribed(recipient.email)
    if (unsubscribed) return { sent: false as const }
    yield* transport.deliver(render(recipient, notice))
    return { sent: true as const }
  })

export const sendPasswordReset = (recipient: Recipient, link: string) =>
  sendTransactionalNotice(recipient, { subject: "Reset your password", body: `Use this link: ${link}` })

export const sendNewsletter = (recipient: Recipient, issue: Notice) => sendMarketingNotice(recipient, issue)
