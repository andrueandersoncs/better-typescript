import { Effect, Schedule } from "effect"

export interface InventorySnapshot {
  readonly warehouseId: string
  readonly items: ReadonlyArray<{ readonly sku: string; readonly onHand: number }>
}

declare const fetchSnapshot: (warehouseId: string) => Effect.Effect<InventorySnapshot, Error>
declare const storeSnapshot: (snapshot: InventorySnapshot) => Effect.Effect<void>

const backoff = Schedule.exponential("1 second").pipe(Schedule.intersect(Schedule.recurs(5)))

// Each request to a warehouse gets at most 10 seconds; a slow attempt is
// abandoned and retried so one stuck connection does not stall the job.
const perAttemptBudget = "10 seconds"

export const pullInventory = (warehouseId: string) =>
  Effect.timeout(Effect.retry(fetchSnapshot(warehouseId), backoff), perAttemptBudget).pipe(
    Effect.flatMap(storeSnapshot),
    Effect.tapError((error) => Effect.logWarning(`inventory pull failed for ${warehouseId}`, error)),
  )

export const pullAll = (warehouseIds: ReadonlyArray<string>) =>
  Effect.forEach(warehouseIds, (id) => Effect.either(pullInventory(id)), {
    concurrency: 3,
  }).pipe(
    Effect.tap((results) =>
      Effect.logInfo(`pulled ${results.filter((r) => r._tag === "Right").length} warehouses`),
    ),
  )
