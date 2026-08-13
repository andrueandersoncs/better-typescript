import { HashMap, MutableRef, Option } from "effect"
import type * as ts from "typescript"
import type { ImportedMember } from "./importedMember.js"

const emptyImportedMemberCache =
  Option.none<readonly [ts.TypeChecker, HashMap.HashMap<string, Option.Option<ImportedMember>>]>()

// The cache retains one checker because project analysis is sequential.
export const importedMemberCache = MutableRef.make(emptyImportedMemberCache)
