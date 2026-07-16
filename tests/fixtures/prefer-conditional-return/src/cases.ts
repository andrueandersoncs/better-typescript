export {}

function earlyReturn(ready: boolean): string {
  if (ready) { // ~detect 3
    return "yes"
  }
  return "no"
}

function ifElseReturn(score: number): string {
  if (score > 0) { // ~detect 3
    return "positive"
  } else {
    return "non-positive"
  }
}

function negatedCondition(ready: boolean): string {
  if (!ready) { // ~detect 3
    return "blocked"
  }
  return "open"
}

function bracelessThen(active: boolean): number {
  if (active) return 1 // ~detect 3
  return 0
}

function chooseVars(useFirst: boolean, first: number, second: number): number {
  if (useFirst) { // ~detect 3
    return first
  }
  return second
}
