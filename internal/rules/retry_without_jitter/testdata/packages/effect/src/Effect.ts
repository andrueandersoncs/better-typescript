export interface Effect {
  readonly pipe: (...stages: ReadonlyArray<unknown>) => Effect
}

export declare const retry: {
  (self: Effect, policy: unknown): Effect
  (policy: unknown): (self: Effect) => Effect
}

export declare const retryOrElse: {
  (self: Effect, policy: unknown, fallback: unknown): Effect
  (policy: unknown, fallback: unknown): (self: Effect) => Effect
}
