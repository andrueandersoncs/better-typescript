export interface Schedule {
  readonly pipe: (...stages: ReadonlyArray<unknown>) => Schedule
}

export declare const forever: Schedule
export declare const recurs: (times: number) => Schedule
export declare const duration: (duration: string) => Schedule
export declare const exponential: (duration: string, factor?: number) => Schedule
export declare const fibonacci: (duration: string) => Schedule
export declare const fixed: (duration: string) => Schedule
export declare const spaced: (duration: string) => Schedule
export declare const windowed: (duration: string) => Schedule
export declare const jittered: (self: Schedule) => Schedule
export declare const passthrough: (self: Schedule) => Schedule
export declare const max: (schedules: ReadonlyArray<Schedule>) => Schedule
export declare const min: (schedules: ReadonlyArray<Schedule>) => Schedule
export declare const upTo: (options: { readonly times?: number; readonly duration?: string }) => (self: Schedule) => Schedule
declare const while_: (predicate: (metadata: unknown) => boolean) => (self: Schedule) => Schedule
export { while_ as while }
