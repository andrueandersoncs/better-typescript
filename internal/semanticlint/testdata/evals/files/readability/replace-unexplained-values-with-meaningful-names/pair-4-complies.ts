type Fetcher = {
  readonly load: () => Promise<ReadonlyArray<string>>
}

type Scheduler = {
  readonly schedule: (task: () => void, delayMs: number) => void
}

const inventoryRefreshDelayMs = 3000

export const refreshInventory = (fetcher: Fetcher, scheduler: Scheduler): void => {
  const reload = (): void => {
    void fetcher.load()
    scheduler.schedule(reload, inventoryRefreshDelayMs)
  }
  reload()
}
