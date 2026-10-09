import { Duration, Effect, Schedule } from "effect";
import { HttpClient } from "@effect/platform";
import type { ExchangeRate } from "./rates";

export const fetchExchangeRate = (base: string, quote: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const response = yield* client.get(`https://rates.internal/v1/${base}/${quote}`);
    const body = (yield* response.json) as { rate: number; asOf: string };
    return { base, quote, rate: body.rate, asOf: new Date(body.asOf) } satisfies ExchangeRate;
  });

export const convertCart = (totalCents: number, currency: string) =>
  Effect.gen(function* () {
    if (currency === "USD") {
      return totalCents;
    }
    const exchangeRate = yield* fetchExchangeRate("USD", currency).pipe(
      Effect.timeout(Duration.seconds(2)),
      Effect.retry(Schedule.exponential("100 millis").pipe(Schedule.intersect(Schedule.recurs(3)))),
    );
    return Math.round(totalCents * exchangeRate.rate);
  });
