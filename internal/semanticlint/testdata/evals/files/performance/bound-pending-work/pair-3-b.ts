type LogEntry = {
  readonly timestamp: string
  readonly message: string
}

const maximumBufferedEntries = 1_000

export class LogBatcher {
  private readonly entries: LogEntry[] = []
  private flushing = false

  record(entry: LogEntry): void {
    if (this.entries.length >= maximumBufferedEntries) {
      return
    }
    this.entries.push(entry)
    void this.flush()
  }

  private async flush(): Promise<void> {
    if (this.flushing) return
    this.flushing = true
    while (this.entries.length > 0) {
      const batch = this.entries.splice(0, 50)
      await fetch("https://logs.example/v1/entries", {
        method: "POST",
        body: JSON.stringify(batch),
      })
    }
    this.flushing = false
  }
}
