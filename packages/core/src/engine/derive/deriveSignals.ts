export const deriveSignals = <A, B>(derive: (elements: ReadonlyArray<A>) => ReadonlyArray<B>) =>
  derive
