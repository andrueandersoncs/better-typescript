import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import { makeFunctionalCoreEffect } from "@better-typescript/matchers/builtins/functionalCoreEffect/functionalCoreEffect"
import {
  FunctionalCoreBoundaryData,
  type FunctionalCoreBoundaryKind
} from "@better-typescript/matchers/builtins/functionalCoreEffect/data"
import {
  defaultFunctionalCoreEffectPolicy,
  type FunctionalCoreEffectPolicy
} from "@better-typescript/matchers/builtins/functionalCoreEffect/policy"
import { makeBuiltinPolicy } from "../definePolicy.js"

const messageByKind: Readonly<Record<FunctionalCoreBoundaryKind, string>> = {
  "dependency-direction": "This dependency points outward across the functional-core architecture.",
  "domain-effect-program":
    "Keep the domain core pure instead of constructing an Effect program here.",
  "direct-capability": "Access concrete capabilities only through an adapter at a declared seam.",
  "runtime-execution": "Run Effect programs only at a configured composition root.",
  "dependency-provisioning": "Choose and provide live implementations only at a composition root.",
  "port-live-implementation":
    "A port declares an interface; its live implementation belongs in an adapter.",
  "infrastructure-contract":
    "Do not expose infrastructure or mutable runtime handles through a port contract.",
  "service-locator":
    "Require individual services through the Effect context channel instead of passing a context or runtime bag.",
  "unsuspended-adapter-effect":
    "Suspend the foreign operation before composing it into an Effect program.",
  "unscoped-resource": "Acquire this external resource in an Effect-managed lifecycle.",
  "escaping-runtime-state":
    "Create shared Effect state inside a Layer.effect service instead of letting it escape."
}

const hintByKind: Readonly<Record<FunctionalCoreBoundaryKind, string>> = {
  "dependency-direction":
    "Move the dependency behind a domain-owned port, or move this behaviour to the outer role that owns the implementation.",
  "domain-effect-program":
    "Return an immutable domain decision from a plain function; let application code translate the decision into Effect operations.",
  "direct-capability":
    "Declare a Context.Service port with domain inputs and outputs, then implement it with a Layer in an adapter.",
  "runtime-execution":
    "Return the Effect value with its requirements visible; provide and run it once in main, bootstrap, wiring, or a test boundary.",
  "dependency-provisioning":
    "Leave the R channel open through application code and compose Layers where the application starts.",
  "port-live-implementation":
    "Use Context.Service for the port and export Layer.effect or Layer.succeed from an adapter Module.",
  "infrastructure-contract":
    "Expose domain-owned values, errors, Effect, or Stream; keep SDK clients, Promise, Runtime, Ref, Queue, and PubSub private to the adapter.",
  "service-locator":
    "Yield the precise Context.Service requirement where it is used; never pass Context.Context or a Runtime as a dependency bag.",
  "unsuspended-adapter-effect":
    "Use Effect.sync, Effect.try, Effect.tryPromise, or Effect.callback around the lazy foreign call; Effect.succeed does not suspend work.",
  "unscoped-resource":
    "Pair acquisition and release with Effect.acquireRelease or acquireDisposable, then expose the scoped implementation through a Layer.",
  "escaping-runtime-state":
    "Use Ref.make or the appropriate Queue/PubSub constructor while building a Layer.effect service and keep the handle out of the port surface."
}

const makeFunctionalCoreEffectBoundariesFindings = (match: Match<FunctionalCoreBoundaryData>) =>
  makeFindings(
    match.target,
    messageByKind[match.fact.kind],
    hintByKind[match.fact.kind],
    match.fact
  )

export const makeFunctionalCoreEffectBoundaries = (policy: FunctionalCoreEffectPolicy) => {
  const matcher = makeFunctionalCoreEffect(policy)

  return makeBuiltinPolicy(
    "functional-core-effect-boundaries",
    matcher,
    Function.constant(makeFunctionalCoreEffectBoundariesFindings)
  )
}

export const functionalCoreEffectBoundaries = makeFunctionalCoreEffectBoundaries(
  defaultFunctionalCoreEffectPolicy
)
