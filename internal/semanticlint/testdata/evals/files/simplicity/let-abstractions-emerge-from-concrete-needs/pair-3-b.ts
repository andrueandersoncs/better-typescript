type Session = {
  userId: string
  token: string
}

export async function writeSession(session: Session): Promise<void> {
  await redis.set(`session:${session.token}`, session.userId)
}

export async function removeSession(token: string): Promise<void> {
  await redis.delete(`session:${token}`)
}

export async function readSession(token: string): Promise<string | undefined> {
  return redis.get(`session:${token}`)
}

declare const redis: {
  set(key: string, value: string): Promise<void>
  get(key: string): Promise<string | undefined>
  delete(key: string): Promise<void>
}
