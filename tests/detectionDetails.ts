import type { SourceLocation } from "./sourceLocation.js"

export interface DetectionDetails extends SourceLocation {
  readonly message: string
  readonly hint: string
}
