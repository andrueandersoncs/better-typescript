import { flow } from "effect"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import type { Matcher, WorkspaceMatcher } from "@better-typescript/matchers/matcher/data"
import {
  makePolicy,
  makeSilentPolicy,
  makeSilentWorkspacePolicy,
  makeWorkspacePolicy
} from "@better-typescript/core/engine/policy"
import {
  type Guidance,
  type Policy,
  type WorkspaceGuidance,
  type WorkspacePolicy
} from "@better-typescript/core/engine/policy/data"
import { makeDirectoryRefactorExamples } from "@better-typescript/core/engine/example"
import type { RefactorExampleSource } from "@better-typescript/core/engine/example/data"

const moduleUrlPath = fileURLToPath(import.meta.url)
const moduleDirectory = path.dirname(moduleUrlPath)
const packageExamplesRoot = path.resolve(moduleDirectory, "..", "examples")

// Package examples remain inert descriptors because report rendering owns their effectful loading.
const packageExampleDirectory = (name: string) => path.join(packageExamplesRoot, name)

export const packageExamples: (name: string) => RefactorExampleSource = flow(
  packageExampleDirectory,
  makeDirectoryRefactorExamples
)

export const makeBuiltinPolicy = <Fact>(
  name: string,
  matcher: Matcher,
  guidance: Guidance<Fact>
): Policy => {
  const examples = packageExamples(name)

  return makePolicy<
    Fact,
    {
      readonly name: string
      readonly matcher: Matcher
      readonly guidance: Guidance<Fact>
      readonly examples: RefactorExampleSource
    }
  >({
    name,
    matcher,
    guidance,
    examples
  })
}

export const makeSilentBuiltinPolicy = <Fact>(
  name: string,
  matcher: Matcher,
  guidance: Guidance<Fact>
): Policy => {
  const examples = packageExamples(name)

  return makeSilentPolicy<
    Fact,
    {
      readonly name: string
      readonly matcher: Matcher
      readonly guidance: Guidance<Fact>
      readonly examples: RefactorExampleSource
    }
  >({
    name,
    matcher,
    guidance,
    examples
  })
}

export const makeBuiltinWorkspacePolicy = <Fact>(
  name: string,
  matcher: WorkspaceMatcher,
  guidance: WorkspaceGuidance<Fact>
): WorkspacePolicy => {
  const examples = packageExamples(name)

  return makeWorkspacePolicy<
    Fact,
    {
      readonly name: string
      readonly matcher: WorkspaceMatcher
      readonly guidance: WorkspaceGuidance<Fact>
      readonly examples: RefactorExampleSource
    }
  >({
    name,
    matcher,
    guidance,
    examples
  })
}

export const makeSilentBuiltinWorkspacePolicy = <Fact>(
  name: string,
  matcher: WorkspaceMatcher,
  guidance: WorkspaceGuidance<Fact>
): WorkspacePolicy => {
  const examples = packageExamples(name)

  return makeSilentWorkspacePolicy<
    Fact,
    {
      readonly name: string
      readonly matcher: WorkspaceMatcher
      readonly guidance: WorkspaceGuidance<Fact>
      readonly examples: RefactorExampleSource
    }
  >({
    name,
    matcher,
    guidance,
    examples
  })
}
