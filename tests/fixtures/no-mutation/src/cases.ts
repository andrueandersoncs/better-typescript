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

counter.count = 1
counter.count += 1
scores[0] = 100
grid[0][1] = 5
counter.count++
--counter.count
delete config.name
config.name ??= "fallback"

// Rebinding a project-declared binding mutates first-party state.
let label = "start"
label = "changed"

// A parameter is a project-declared binding.
export const overwriteParameter = (value: number): number => (value = 0)

// Built-in JavaScript values are first-party data even though lib.es declares them.
Error.prototype.name = "Failure"

export const useLabel = (): string => label
