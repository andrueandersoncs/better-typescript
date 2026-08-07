// ResultExecution is shared because naming policies must classify one execution boundary.
export type ResultExecution = "effect" | "promise" | "pure"
