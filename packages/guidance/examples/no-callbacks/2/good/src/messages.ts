import { Stream } from "effect"

interface Message {
  readonly data: string
}

interface MessageSocket extends Stream.EventListener<Message> {}

declare const socket: MessageSocket

// Streaming: emits every event until the scope is closed.
export const messages = Stream.fromEventListener(socket, "message")
