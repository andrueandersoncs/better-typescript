import type { Json } from "effect/Schema"

declare const input: string
const rawJson: Json = JSON.parse(input)
type Raw = unknown
const rawAlias: Raw = JSON.parse(input)
const domain: { id: string; extra: unknown } = JSON.parse(input)
let replaced: unknown = JSON.parse(input)
replaced = { id: "local" }
const local = replaced as { id: string }
