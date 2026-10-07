type Region = "eu" | "us"

type Account = {
  readonly id: string
  readonly region: Region
}

export const accountLabel = (account: Account): string =>
  `${account.region}:${account.id}`

export const isEuropeanAccount = (account: Account): boolean =>
  account.region === "eu"

export const accountId = (account: Account): string => account.id
