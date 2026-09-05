import { Effect } from "effect"

declare const fallback: AbortSignal

Effect.promise((signal = fallback) => Promise.resolve(1))
Effect.tryPromise((signal = fallback) => Promise.resolve(1))
Effect.tryPromise({ try: (signal = fallback) => Promise.resolve(1), catch: () => new Error("failed") })
Effect.callback((resume, signal = fallback) => { resume(Effect.succeed(1)) })
Effect.callback((resume = () => {}, signal) => { signal.addEventListener("abort", () => {}); resume(Effect.succeed(1)) })

Effect.promise(() => Promise.resolve(1))
Effect.tryPromise((signal?: AbortSignal) => Promise.resolve(1))
Effect.callback((resume, signal?: AbortSignal) => { void signal; resume(Effect.succeed(1)) })
