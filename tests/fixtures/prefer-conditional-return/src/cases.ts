export {}

function earlyReturn(ready: boolean): string {
  if (ready) {
    return "yes"
  }
  return "no"
}

function ifElseReturn(score: number): string {
  if (score > 0) {
    return "positive"
  } else {
    return "non-positive"
  }
}

function negatedCondition(ready: boolean): string {
  if (!ready) {
    return "blocked"
  }
  return "open"
}

function bracelessThen(active: boolean): number {
  if (active) return 1
  return 0
}

function chooseVars(useFirst: boolean, first: number, second: number): number {
  if (useFirst) {
    return first
  }
  return second
}
