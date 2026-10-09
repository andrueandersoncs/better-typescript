import { Context, Effect, Layer } from "effect"
import { Resend } from "resend"

export interface WelcomeEmail {
  readonly to: string
  readonly name: string
}

export class Mailer extends Context.Tag("Mailer")<
  Mailer,
  { readonly sendWelcome: (msg: WelcomeEmail) => Effect.Effect<void, Error> }
>() {}

export type MailProvider = "resend" | "ses" | "sendgrid" | "postmark"

const providerFromEnv = (): MailProvider => (process.env.MAIL_PROVIDER as MailProvider) ?? "resend"

export const MailerLive = Layer.sync(Mailer, () => {
  const provider = providerFromEnv()
  if (provider !== "resend") throw new Error(`Mail provider ${provider} not supported`)
  const resend = new Resend(process.env.RESEND_API_KEY)
  return {
    sendWelcome: (msg) =>
      Effect.tryPromise({
        try: () =>
          resend.emails.send({
            from: "hello@acme.dev",
            to: msg.to,
            subject: `Welcome, ${msg.name}`,
            text: "Your account is ready."
          }),
        catch: (e) => new Error(String(e))
      }).pipe(Effect.asVoid)
  }
})
