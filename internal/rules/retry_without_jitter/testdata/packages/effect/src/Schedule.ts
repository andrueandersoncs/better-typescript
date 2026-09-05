export interface Schedule {
  readonly pipe: (...stages: ReadonlyArray<unknown>) => Schedule
}

export declare const exponential: (duration: string, factor?: number) => Schedule
export declare const fibonacci: (duration: string) => Schedule
export declare const fixed: (duration: string) => Schedule
export declare const jittered: (self: Schedule) => Schedule
export declare const max: (schedules: ReadonlyArray<Schedule>) => Schedule
export declare const min: (schedules: ReadonlyArray<Schedule>) => Schedule
export declare const passthrough: (self: Schedule) => Schedule
