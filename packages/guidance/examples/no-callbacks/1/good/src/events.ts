import { Effect } from "effect"

interface Message {
  readonly data: string
}

interface MessageSocket {
  addEventListener(event: "message", handler: (msg: Message) => void): MessageSocket
}

declare const socket: MessageSocket

type MessageListener = (msg: Message) => void

type MessageResume = (effect: Effect.Effect<Message>) => void

const resumeWithMessage =
  (resume: MessageResume): MessageListener =>
  (msg) => {
    const succeeded = Effect.succeed(msg)
    resume(succeeded)
  }

// One-shot: resolves on the first event, then the Effect completes.
export const onMessage = Effect.callback<Message>((resume) => {
  socket.addEventListener("message", resumeWithMessage(resume))

  return Effect.void
})
