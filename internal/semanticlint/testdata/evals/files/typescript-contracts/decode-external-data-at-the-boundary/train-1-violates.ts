import { Effect, Schema } from "effect"
import { HttpClient, HttpClientResponse } from "@effect/platform"

export const ExchangeRates = Schema.Struct({
  base: Schema.String,
  rates: Schema.Record({ key: Schema.String, value: Schema.Number })
})
export type ExchangeRates = typeof ExchangeRates.Type

export const convert = (rates: ExchangeRates, amount: number, to: string): number => {
  const rate = rates.rates[to]
  if (rate === undefined) throw new Error(`No rate for ${to}`)
  return Math.round(amount * rate * 100) / 100
}

export const fetchRates = (base: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const res = yield* client.get(`https://rates.example.com/latest?base=${base}`)
    const body = yield* res.json
    return body as ExchangeRates
  })
