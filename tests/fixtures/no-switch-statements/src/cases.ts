export {}

// Switch over a string union
function handleKind(kind: "a" | "b" | "c"): number {
  switch (kind) {
    case "a":
      return 1
    case "b":
      return 2
    case "c":
      return 3
    default:
      return 0
  }
}

// Switch over a number
function classify(value: number): string {
  switch (value) {
    case 0:
      return "zero"
    case 1:
      return "one"
    default:
      return "other"
  }
}

// Nested switch (outer then inner match)
function nestedSwitch(outer: "x" | "y", inner: 1 | 2): string {
  switch (outer) {
    case "x":
      switch (inner) {
        case 1:
          return "x1"
        default:
          return "x2"
      }
    default:
      return "other"
  }
}
