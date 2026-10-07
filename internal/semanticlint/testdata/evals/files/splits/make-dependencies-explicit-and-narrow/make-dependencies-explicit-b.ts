type Clock = Readonly<{
  now: () => string
}>

type Expiration = Readonly<{
  createdAt: string
  expiresAt: string
}>

export const createExpiration = (clock: Clock): Expiration => ({
  createdAt: clock.now(),
  expiresAt: "2026-10-08T12:00:00Z",
})

export const expirationDateFor = (expiration: Expiration): string =>
  expiration.expiresAt
