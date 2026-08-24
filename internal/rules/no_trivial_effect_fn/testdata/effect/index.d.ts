export declare namespace Effect { type Effect<A> = Generator<never, A, never> }
export declare const Effect: { fn: (name: string) => (body: (...args: any[]) => Generator) => (...args: any[]) => unknown };
