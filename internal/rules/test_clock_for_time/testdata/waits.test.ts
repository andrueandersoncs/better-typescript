import delay from "delay"
import { setTimeout as sleep } from "node:timers/promises"
import { Effect } from "effect"
import { it } from "@effect/vitest"
import { TestClock } from "effect/testing"
import { pause } from "./pause"

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function settle() {
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 0)
  })
}

export const waits = async () => {
  await new Promise((resolve) => setTimeout(resolve, 20))
  await wait(10)
  await pause(10)
  await settle()
  await delay(10)
  await sleep(10)
  await Bun.sleep(10)
  await page.waitForTimeout(10)
  await Effect.runPromise(Effect.sleep(10))
  await Effect.sleep(10).pipe(Effect.runPromise)
}

it.live("sleeps on the live clock", () => Effect.sleep(10))
it.effect("sleeps outside the test clock", () => TestClock.withLive(Effect.sleep(10)))

export const events = async () => {
  await new Promise((resolve) => queueMicrotask(() => resolve(undefined)))
  setTimeout(() => undefined, 10)
}

it.effect("sleeps on the test clock", () => Effect.sleep(10))
