export {}

declare const Schema: {
  is: (schema: unknown) => (node: unknown) => boolean
}
declare const PureNode: unknown
declare const FailNode: unknown
declare const StepNode: unknown
declare const AgentNode: unknown

type Shape =
  | { readonly kind: "circle"; readonly radius: number }
  | { readonly kind: "square"; readonly side: number }
  | { readonly kind: "rect"; readonly width: number; readonly height: number }

// The motivating example: a chain of Schema.is(...) guards dispatching on `node`.
function foldNode(node: unknown): string {
  if (Schema.is(PureNode)(node)) return "pure" // ~detect 3
  if (Schema.is(FailNode)(node)) return "fail"
  if (Schema.is(StepNode)(node)) return "step"
  if (Schema.is(AgentNode)(node)) return "agent"
  return "dynamic"
}

// Dispatch on a discriminant property, every branch returning.
function area(shape: Shape): number {
  if (shape.kind === "circle") return Math.PI * shape.radius * shape.radius // ~detect 3
  if (shape.kind === "square") return shape.side * shape.side
  if (shape.kind === "rect") return shape.width * shape.height
  return 0
}

// Predicate-function dispatch, bodies that throw also count as exiting the scope.
declare const isAlpha: (token: string) => boolean
declare const isDigit: (token: string) => boolean
declare const isSpace: (token: string) => boolean

function classify(token: string): string {
  if (isAlpha(token)) { // ~detect 3
    return "alpha"
  }
  if (isDigit(token)) {
    return "digit"
  }
  if (isSpace(token)) {
    throw new Error("whitespace")
  }
  return "other"
}
