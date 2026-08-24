interface Counter { count: number }
const counter: Counter = { count: 0 }
counter.count = 1
const clean: Counter = { ...counter, count: 2 }
void clean
