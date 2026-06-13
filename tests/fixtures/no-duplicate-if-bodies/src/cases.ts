export {}

function adjacentGuardDuplicate(input: string): void {
  if (input === "empty") {
    throw new Error("missing")
  }
  if (input === "blank") {
    throw new Error("missing")
  }
}

function unwrappedGuardDuplicate(input: string): void {
  if (input === "one")
    return
  if (input === "two") {
    return
  }
}

function elseIfDuplicate(input: string): string {
  if (input === "short") {
    return "small"
  } else if (input === "tiny") {
    return "small"
  }
  return "large"
}
