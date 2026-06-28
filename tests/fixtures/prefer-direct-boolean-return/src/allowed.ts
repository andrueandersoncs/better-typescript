export {}

function passesThrough(flag: boolean): boolean {
  if (flag) {
    return flag
  }
  return false
}

function fromElse(active: boolean): string | boolean {
  if (active) {
    return "active"
  } else {
    return true
  }
}

function compareReturned(count: number): boolean {
  if (count > 0) {
    return count > 0
  }
  return false
}

function multiStatement(
  active: boolean,
  log: (value: string) => void
): boolean {
  if (active) {
    log("hit")
    return true
  }
  return false
}

function bareReturn(active: boolean): void {
  if (active) {
    return
  }
}
