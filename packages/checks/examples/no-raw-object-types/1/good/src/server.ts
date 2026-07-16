import { Effect } from "effect"

interface ServerAddress {
  readonly host: string
  readonly port: number
}

declare const listen: (address: ServerAddress) => void

export const startServer = (address: ServerAddress) => Effect.sync(() => listen(address))
