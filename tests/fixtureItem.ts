import type { SourceLocation } from "./sourceLocation.js"

export interface FixtureItem extends SourceLocation {
  readonly name: string
}
