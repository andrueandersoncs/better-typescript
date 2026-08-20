export {}

// if/else if chain instead of switch
function useIfElse(kind: "a" | "b" | "c"): number {
  if (kind === "a") {
    return 1
  } else if (kind === "b") {
    return 2
  } else {
    return 3
  }
}

// Object/record lookup instead of switch
const table: Record<string, number> = { a: 1, b: 2, c: 3 }

function useLookup(kind: "a" | "b" | "c"): number {
  return table[kind]
}

// Ternary instead of switch
function useTernary(kind: "a" | "b" | "c"): number {
  return kind === "a" ? 1 : kind === "b" ? 2 : 3
}
