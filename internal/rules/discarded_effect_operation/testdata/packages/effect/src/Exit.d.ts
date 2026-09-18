export interface Exit<A> {
  readonly value: A
}

export declare const succeed: <A>(value: A) => Exit<A>
