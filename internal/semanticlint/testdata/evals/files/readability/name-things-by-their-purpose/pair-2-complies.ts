type Subscription = {
  readonly accountId: string
  readonly cancelledAt: Date | undefined
}

export const listAccounts = (subscriptions: ReadonlyArray<Subscription>): ReadonlyArray<string> => {
  const activeAccountIds = subscriptions
    .filter((subscription) => subscription.cancelledAt === undefined)
    .map((subscription) => subscription.accountId)
  return [...new Set(activeAccountIds)].sort()
}

export const countAccounts = (subscriptions: ReadonlyArray<Subscription>): number =>
  listAccounts(subscriptions).length

export const activeCount = (subscriptions: ReadonlyArray<Subscription>): number =>
  listAccounts(subscriptions).length
