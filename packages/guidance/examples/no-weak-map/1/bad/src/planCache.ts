const plansByProgram = new WeakMap<object, ReadonlyArray<string>>()

export const planFor = (program: object): ReadonlyArray<string> | undefined =>
  plansByProgram.get(program)

export const rememberPlan = (program: object, plans: ReadonlyArray<string>): void => {
  plansByProgram.set(program, plans)
}
