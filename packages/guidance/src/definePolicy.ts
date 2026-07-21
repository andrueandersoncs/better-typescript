import { flow } from "effect"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import type { Matcher, WorkspaceMatcher } from "@better-typescript/matchers/matcher/data"
import {
  definePolicy,
  defineSilentPolicy,
  defineSilentWorkspacePolicy,
  defineWorkspacePolicy
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

export const makePackageExamples: (name: string) => RefactorExampleSource = flow(
  packageExampleDirectory,
  makeDirectoryRefactorExamples
)

export const packageExamples = makePackageExamples

export const defineBuiltinPolicy = <Fact>(
  name: string,
  matcher: Matcher,
  guidance: Guidance<Fact>
): Policy => {
  const examples = makePackageExamples(name)

  return definePolicy<
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

export const defineSilentBuiltinPolicy = <Fact>(
  name: string,
  matcher: Matcher,
  guidance: Guidance<Fact>
): Policy => {
  const examples = makePackageExamples(name)

  return defineSilentPolicy<
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

export const defineBuiltinWorkspacePolicy = <Fact>(
  name: string,
  matcher: WorkspaceMatcher,
  guidance: WorkspaceGuidance<Fact>
): WorkspacePolicy => {
  const examples = makePackageExamples(name)

  return defineWorkspacePolicy<
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

export const defineSilentBuiltinWorkspacePolicy = <Fact>(
  name: string,
  matcher: WorkspaceMatcher,
  guidance: WorkspaceGuidance<Fact>
): WorkspacePolicy => {
  const examples = makePackageExamples(name)

  return defineSilentWorkspacePolicy<
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
