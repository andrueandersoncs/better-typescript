// ResultExecution is shared because naming rules must classify one execution boundary.
export type ResultExecution = "effect" | "promise" | "pure"
