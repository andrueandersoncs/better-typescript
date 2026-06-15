export {}

function elseIfChain(score: number): string {
  if (score > 90) {
    return "A"
  } else if (score > 80) {
    return "B"
  }
  return "C"
}

function notAReturn(active: boolean, log: (value: string) => void): string {
  if (active) {
    return "on"
  }
  log("off")
  return "off"
}

function elseNotValueReturn(active: boolean): string {
  if (active) {
    return "on"
  } else {
    void active
  }
  return "off"
}

function multiStatement(active: boolean, log: (value: string) => void): string {
  if (active) {
    log("hit")
    return "on"
  }
  return "off"
}

function bareReturn(active: boolean): void {
  if (active) {
    return
  }
  return
}
