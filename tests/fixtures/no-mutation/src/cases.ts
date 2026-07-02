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
