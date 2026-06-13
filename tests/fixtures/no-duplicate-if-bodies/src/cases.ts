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

function nonExitingGuardDuplicate(input: string): void {
  if (input === "alpha") {
    void input
  }
  if (input === "beta") {
    void input
  }
}

function separatedGuardDuplicate(input: string): void {
  if (input === "alpha") {
    return
  }
  void input
  if (input === "beta") {
    return
  }
}

function guardWithElseIsIgnored(input: string): void {
  if (input === "alpha") {
    return
  } else {
    void input
  }
  if (input === "beta") {
    return
  }
}

function differentGuardBodies(input: string): void {
  if (input === "alpha") {
    return
  }
  if (input === "beta") {
    throw new Error("beta")
  }
}
