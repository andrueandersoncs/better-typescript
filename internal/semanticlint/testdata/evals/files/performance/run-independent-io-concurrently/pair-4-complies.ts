type Permit = {
  readonly accountId: string
  readonly token: string
}

type Balance = {
  readonly available: number
  readonly currency: string
}

const reservePermit = async (accountId: string): Promise<Permit> =>
  fetch(`/permits/${accountId}`).then((response) => response.json() as Promise<Permit>)

export const prepareTransfer = async (accountId: string) => {
  const permit = await reservePermit(accountId)
  const balance = await fetch(`/accounts/${permit.accountId}/balance`).then((response) => response.json() as Promise<Balance>)

  return { permit, balance }
}
