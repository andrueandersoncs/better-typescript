interface Message {
  readonly data: string
}

interface MessageSocket {
  addEventListener(
    event: "message",
    handler: (msg: Message) => void
  ): MessageSocket
}

declare const socket: MessageSocket

export const onMessage = (handler: (msg: Message) => void): void => {
  socket.addEventListener("message", handler)
}
