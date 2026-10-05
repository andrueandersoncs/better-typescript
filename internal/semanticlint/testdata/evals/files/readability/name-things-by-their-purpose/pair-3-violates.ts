type Message = {
  readonly recipient: string
  readonly subject: string
  readonly body: string
}

type Mailer = {
  readonly deliver: (message: Message) => Promise<void>
}

export const handle = (mailer: Mailer, message: Message): Promise<void> =>
  mailer.deliver(message)

export const createMessage = (recipient: string): Message => ({
  recipient,
  subject: "Account statement",
  body: "Your monthly statement is available."
})
