import { Client, decodeUnknownEffect } from "fixture-sdk"
import { startWebServer } from "./local-api.js"

declare const signal: AbortSignal

export const decoded = decodeUnknownEffect(
  { answer: 1 },
  { onExcessProperty: "error" },
)

export const response = new Client().systemOne(
  { model: "jev" },
  { signal },
)

export const fetched = fetch("/fixture", {
  method: "POST",
})

export const server = startWebServer({
  workspace: "/fixture",
  port: 3000,
  fetchImpl: fetch,
})
