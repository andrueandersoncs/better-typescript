import { Cause, Effect, Queue, Stream } from "effect"

interface Message {
  readonly data: string
}

interface MessageSocket {
  addEventListener(event: "message", handler: (msg: Message) => void): MessageSocket
}

declare const socket: MessageSocket

type MessageListener = (msg: Message) => void

type MessageQueue = Queue.Queue<Message, Cause.Done>

const emitMessage =
  (queue: MessageQueue): MessageListener =>
  (msg) => {
    void Queue.offerUnsafe(queue, msg)
  }

// Streaming: emits every event until the scope is closed.
export const messages = Stream.callback<Message>((queue) => {
  socket.addEventListener("message", emitMessage(queue))

  return Effect.void
})
