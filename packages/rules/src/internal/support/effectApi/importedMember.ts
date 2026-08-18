import { Data } from "effect"

// ImportedMember is shared specifier and member-path pair because helpers exchange one binding.
export class ImportedMember extends Data.Class<{
  readonly moduleSpecifier: string
  readonly path: ReadonlyArray<string>
}> {}
