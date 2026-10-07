export interface Socket {
  send: (message: string) => void
  close: () => void
}

export type OpenSocket = () => Socket

export const transmitNotice = (
  openSocket: OpenSocket,
  message: string,
): void => {
  const socket = openSocket()
  socket.send(message)
}
