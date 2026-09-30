type Handler = () => void
export function apply(callback: Handler): number { callback(); return 1 }
export function acceptUnknownRest(...values: any): void { void values }
declare function consumeImplementation(implementation: (done: Handler) => void): void
consumeImplementation(function (done) { done() })
consumeImplementation((((done: Handler): void => { done() })))
export const promised = new Promise<void>((resolve) => { resolve() })
