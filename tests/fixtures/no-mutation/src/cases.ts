interface Counter {
  count: number
}

interface Config {
  name?: string
}

declare const counter: Counter
declare const config: Config
declare const scores: Array<number>
declare const grid: Array<Array<number>>

counter.count = 1 // ~detect 1
counter.count += 1 // ~detect 1
scores[0] = 100 // ~detect 1
grid[0][1] = 5 // ~detect 1
counter.count++ // ~detect 1
--counter.count // ~detect 3
delete config.name // ~detect 8
config.name ??= "fallback" // ~detect 1

// Rebinding a project-declared binding mutates first-party state.
let label = "start"
label = "changed" // ~detect 1

// A parameter is a project-declared binding.
export const overwriteParameter = (value: number): number => (value = 0) // ~detect 63

// Built-in JavaScript values are first-party data even though lib.es declares them.
Error.prototype.name = "Failure" // ~detect 1

export const useLabel = (): string => label

// Type-parameter receivers must not crash type inspection (Effect Struct.evolve).
export const writeGenericField = <O extends Record<string, number>>(
  obj: O,
  key: keyof O & string,
  value: number
): O => {
  const out: Record<string, number> = { ...obj }
  out[key] = value // ~detect 3
  return out as O
}
