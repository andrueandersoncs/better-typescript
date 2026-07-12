import { Effect, Stream, StreamEmit } from "effect"

interface Message {
  readonly data: string
}

interface MessageSocket {
  addEventListener(event: "message", handler: (msg: Message) => void): MessageSocket
}

declare const socket: MessageSocket

type MessageListener = (msg: Message) => void

type MessageEmit = StreamEmit.Emit<never, never, Message, void>

const emitMessage =
  (emit: MessageEmit): MessageListener =>
  (msg) => {
    void emit.single(msg)
  }

// Streaming: emits every event until the scope is closed.
export const messages = Stream.async<Message>((emit) => {
  socket.addEventListener("message", emitMessage(emit))

  return Effect.void
})
