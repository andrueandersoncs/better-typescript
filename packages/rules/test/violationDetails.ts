import type { SourceLocation } from "./sourceLocation.js"

export interface ViolationDetails extends SourceLocation {
  readonly message: string
}
