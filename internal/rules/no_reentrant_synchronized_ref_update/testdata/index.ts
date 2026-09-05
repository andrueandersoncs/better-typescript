import { Effect, SubscriptionRef, SynchronizedRef } from "effect"

declare const ref: SynchronizedRef.SynchronizedRef<number>
declare const other: SynchronizedRef.SynchronizedRef<number>
declare const subscription: SubscriptionRef.SubscriptionRef<number>

SynchronizedRef.updateEffect(ref, (value) => SynchronizedRef.modify(ref, (next) => [value, next] as const))
SynchronizedRef.updateEffect(ref, (value) => Effect.gen(function* () {
  yield* SynchronizedRef.update(ref, (next) => next + 1)
  return value
}))
SubscriptionRef.modifyEffect(subscription, (value) => SubscriptionRef.modify(subscription, (next) => [[value, next] as const, next] as const))
SynchronizedRef.updateEffect(ref, () => SynchronizedRef.getAndUpdate(ref, (value) => value + 1))

SynchronizedRef.updateEffect(ref, () => SynchronizedRef.get(ref))
SynchronizedRef.updateEffect(ref, () => SynchronizedRef.modify(other, (value) => [value, value + 1] as const))
SynchronizedRef.updateEffect(ref, (value) => Effect.suspend(() => {
  const pending = SynchronizedRef.update(ref, (next) => next + 1)
  void pending
  return Effect.succeed(value)
}))
SynchronizedRef.updateEffect(ref, (value) => {
  const unused = Effect.gen(function* () {
    yield* SynchronizedRef.update(ref, (next) => next + 1)
    return value
  })
  void unused
  return Effect.succeed(value)
})
