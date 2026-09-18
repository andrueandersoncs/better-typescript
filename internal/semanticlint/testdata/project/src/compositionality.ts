declare const connect: () => void
declare const request: Request

connect()

export const parsedBody = request.json()
