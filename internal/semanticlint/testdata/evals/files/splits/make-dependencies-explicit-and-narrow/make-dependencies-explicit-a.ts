type Clock = Readonly<{
  now: () => string
}>

type Expiration = Readonly<{
  createdAt: string
  expiresAt: string
}>

const systemClock: Clock = {
  now: () => "2026-10-07T12:00:00Z",
}

export const createExpiration = (): Expiration => ({
  createdAt: systemClock.now(),
  expiresAt: "2026-10-08T12:00:00Z",
})

export const expirationDateFor = (expiration: Expiration): string =>
  expiration.expiresAt
