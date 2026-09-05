export interface Effect<A, E = never, R = never> {
  pipe<B>(f: (self: Effect<A, E, R>) => B): B
}

export declare const mapError: {
  <A, E, E2, R>(f: (error: E) => E2): (self: Effect<A, E, R>) => Effect<A, E2, R>
}

export declare function succeed<A>(value: A): Effect<A>
