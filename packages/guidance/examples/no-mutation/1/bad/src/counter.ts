interface Counter {
  count: number
}

declare const counter: Counter
declare const scores: Array<number>

counter.count = counter.count + 1
scores[0] = 100
