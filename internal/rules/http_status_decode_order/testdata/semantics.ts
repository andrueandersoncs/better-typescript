import type { Json } from "effect/Schema"

declare const response: Response
export async function rawJson(): Promise<Json> { return response.json() }
export async function domainWithUnknown(): Promise<{ id: string; extra: unknown }> {
  return response.json()
}
export async function replaced() {
  let raw: unknown = await response.json()
  raw = { id: "local" }
  return raw as { id: string }
}
