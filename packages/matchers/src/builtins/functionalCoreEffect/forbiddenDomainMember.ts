import { Array, Function, Option, Record, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"

export const forbiddenDomainNamespaces: Readonly<Record<string, true>> = {
  Effect: true,
  Layer: true,
  Context: true,
  Stream: true,
  Sink: true,
  Channel: true,
  Ref: true,
  SynchronizedRef: true,
  Queue: true,
  PubSub: true,
  SubscriptionRef: true,
  References: true,
  Runtime: true,
  ManagedRuntime: true,
  Scope: true,
  Latch: true,
  Semaphore: true
}

export const namespaceIsForbidden = (namespace: string) =>
  strictEqual(true)(forbiddenDomainNamespaces[namespace])

export const isForbiddenDomainMember = (moduleSpecifier: string, path: ReadonlyArray<string>) => {
  if (moduleSpecifier.startsWith("effect/")) {
    const effectPath = moduleSpecifier.slice("effect/".length)
    const segments = effectPath.split("/")
    const namespace = Array.get(segments, 0)

    return pipe(namespace, Option.exists(namespaceIsForbidden))
  }

  const isEffectModule = strictEqual("effect")(moduleSpecifier)
  const pathHead = Array.get(path, 0)

  const namespaceForbidden = pipe(
    pathHead,
    Option.match({
      onNone: Function.constTrue,
      onSome: namespaceIsForbidden
    })
  )

  return isEffectModule && namespaceForbidden
}
