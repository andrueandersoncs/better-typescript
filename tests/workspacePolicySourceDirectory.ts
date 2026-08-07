import { Array } from "effect"
import { makeWorkspacePolicy } from "@better-typescript/core/engine/policy/makeWorkspacePolicy"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { Match } from "@better-typescript/matchers/matcher/match"
import { makeDirectoryMatcher } from "@better-typescript/matchers/matcher/makeDirectoryMatcher"

export interface DirectoryFact {
  readonly fileCount: number
}

export const directoryFact = (fileCount: number): DirectoryFact => ({ fileCount })

export const sourceDirectoryMatcher = makeDirectoryMatcher((target) => {
  if (target.path !== "src") {
    return Array.empty()
  }

  return Array.of(new Match({ target, fact: directoryFact(target.sourceFiles.length) }))
})

export const sourceDirectoryPolicy = makeWorkspacePolicy({
  name: "source-directory",
  matcher: sourceDirectoryMatcher,
  guidance: () => (match) =>
    makeFindings(
      match.target,
      "Source directory.",
      "Keep source files together intentionally.",
      match.fact
    ),
  examples: { _tag: "inline", examples: Array.empty() }
})
