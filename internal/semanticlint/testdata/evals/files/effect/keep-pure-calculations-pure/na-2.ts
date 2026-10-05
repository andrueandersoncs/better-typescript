export interface SessionRecord {
  readonly key: string
  readonly createdAt: Date
  readonly expiresAt: Date
}

export interface SessionStore {
  readonly read: (key: string) => Promise<SessionRecord | undefined>
  readonly write: (record: SessionRecord) => Promise<void>
  readonly remove: (key: string) => Promise<void>
}

export class MemorySessionStore implements SessionStore {
  readonly records = new Map<string, SessionRecord>()

  read(key: string) {
    return Promise.resolve(this.records.get(key))
  }

  write(record: SessionRecord) {
    this.records.set(record.key, record)
    return Promise.resolve()
  }

  remove(key: string) {
    this.records.delete(key)
    return Promise.resolve()
  }
}
