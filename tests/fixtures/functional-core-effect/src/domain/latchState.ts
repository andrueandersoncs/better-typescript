import { Latch, Semaphore } from "effect"

export const openGate = Latch.makeUnsafe(false)
export const permits = Semaphore.makeUnsafe(1)
