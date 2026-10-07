type Session = {
  userId: string
  token: string
}

interface SessionCache {
  save(session: Session): Promise<void>
}

class RedisSessionCache implements SessionCache {
  async save(session: Session): Promise<void> {
    await redis.set(`session:${session.token}`, session.userId)
  }
}

export class SessionWriter {
  constructor(private readonly cache: SessionCache) {}

  async write(session: Session): Promise<void> {
    await this.cache.save(session)
  }
}

export function createSessionWriter() {
  return new SessionWriter(new RedisSessionCache())
}

declare const redis: { set(key: string, value: string): Promise<void> }
