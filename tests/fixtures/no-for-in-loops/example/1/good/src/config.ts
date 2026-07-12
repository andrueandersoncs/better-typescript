import { Record } from "effect"

declare const config: Record.ReadonlyRecord<string, string>

export const result = Record.map(config, (value) => value.toUpperCase())
