import { Effect } from "effect"

declare const listen: (config: { host: string; port: number }) => void

export const startServer = (config: { host: string; port: number }) =>
  Effect.sync(() => listen(config))
