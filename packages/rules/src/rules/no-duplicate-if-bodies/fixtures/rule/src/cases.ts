export {}

function adjacentGuardDuplicate(input: string): void {
  if (input === "empty") {
    throw new Error("missing")
  }
  if (input === "blank") { // ~detect 3
    throw new Error("missing")
  }
}

function unwrappedGuardDuplicate(input: string): void {
  if (input === "one") return
  if (input === "two") { // ~detect 3
    return
  }
}

function elseIfDuplicate(input: string): string {
  if (input === "short") {
    return "small"
  } else if (input === "tiny") { // ~detect 10
    return "small"
  }
  return "large"
}
