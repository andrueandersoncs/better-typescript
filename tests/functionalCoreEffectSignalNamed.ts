import * as assert from "node:assert/strict"
import type { Signal } from "@better-typescript/core/engine/signal/data"

export const signalNamed = (signals: ReadonlyArray<Signal>, name: string): Signal => {
  const signal = signals.find((candidate) => candidate.name === name)
  assert.ok(signal)
  return signal
}
