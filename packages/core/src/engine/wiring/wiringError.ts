import type { Wiring } from "./wiringClass.js"

// WiringError extracts the failure channel because wiring composition unions member errors.
export type WiringError<T> = T extends Wiring<infer E> ? E : never
