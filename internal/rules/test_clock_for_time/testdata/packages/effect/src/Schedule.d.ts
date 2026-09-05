export interface Schedule<Out> {
  readonly output: Out
}

export declare const exponential: (base: number) => Schedule<number>
