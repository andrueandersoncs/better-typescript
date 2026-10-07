type RebuildJob = {
  readonly tenantId: string
  readonly run: () => Promise<void>
}

export class RebuildQueue {
  private readonly pending: RebuildJob[] = []
  private active = 0

  enqueue(job: RebuildJob): void {
    this.pending.push(job)
    this.startAvailableJobs()
  }

  private startAvailableJobs(): void {
    while (this.active < 4 && this.pending.length > 0) {
      const job = this.pending.shift()
      if (job === undefined) return
      this.active += 1
      void job.run().finally(() => {
        this.active -= 1
        this.startAvailableJobs()
      })
    }
  }
}
