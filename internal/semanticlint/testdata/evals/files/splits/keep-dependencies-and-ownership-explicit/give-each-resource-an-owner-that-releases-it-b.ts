export interface Socket {
  send: (message: string) => void
  close: () => void
}

export const transmitNotice = (
  socket: Socket,
  message: string,
): void => {
  socket.send(message)
}

export const closeSocket = (socket: Socket): void => {
  socket.close()
}
