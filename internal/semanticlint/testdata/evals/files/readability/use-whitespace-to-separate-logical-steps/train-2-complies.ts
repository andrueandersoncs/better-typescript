import { Effect } from "effect"
import { MetricsStore } from "./MetricsStore"
import { SlackClient } from "./SlackClient"

export interface LatencySample {
  readonly route: string
  readonly durationMs: number
}

const percentile = (values: ReadonlyArray<number>, p: number): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[index] ?? 0
}

export const reportSlowRoutes = (thresholdMs: number) =>
  Effect.gen(function* () {
    const store = yield* MetricsStore
    const slack = yield* SlackClient

    const samples = yield* store.lastHour()

    const byRoute = new Map<string, Array<number>>()
    for (const sample of samples) {
      const bucket = byRoute.get(sample.route) ?? []
      bucket.push(sample.durationMs)
      byRoute.set(sample.route, bucket)
    }

    const slow = [...byRoute.entries()]
      .map(([route, durations]) => ({ route, p95: percentile(durations, 95) }))
      .filter((entry) => entry.p95 > thresholdMs)

    if (slow.length > 0) {
      yield* slack.post("#perf", slow.map((s) => `${s.route}: ${s.p95}ms`).join("\n"))
    }
  })
