import { flow } from "effect"
import { withProgramMatcherIndex } from "../matcher/withProgramMatcherIndex.js"
import { fileElementsMatcher } from "./fileElementSubscriptions.js"

// Program-indexed file matchers share withProgramMatcherIndex because evidence wires the same way.
export const programIndexedFileMatcher = flow(withProgramMatcherIndex, fileElementsMatcher)
