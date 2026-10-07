type Clock = {
  readonly now: () => Date
}

const systemClock: Clock = {
  now: () => new Date(),
}

type Invoice = {
  readonly dueAt: Date
}

export const isOverdue = (invoice: Invoice): boolean => {
  const currentTime = systemClock.now()
  return invoice.dueAt < currentTime
}
