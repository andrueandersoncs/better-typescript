import {
  definePolicy as definePolicyImpl,
  defineSilentPolicy as defineSilentPolicyImpl,
  defineSilentWorkspacePolicy as defineSilentWorkspacePolicyImpl,
  defineWorkspacePolicy as defineWorkspacePolicyImpl,
  makeFindings as makeFindingsImpl,
  makePolicy as makePolicyImpl,
  makeSilentPolicy as makeSilentPolicyImpl,
  makeSilentWorkspacePolicy as makeSilentWorkspacePolicyImpl,
  makeWorkspacePolicy as makeWorkspacePolicyImpl,
  oneFinding as oneFindingImpl
} from "./define.js"
import {
  compilerOptionsForPolicies as compilerOptionsForPoliciesImpl,
  makeDetection as makeDetectionImpl,
  makeWorkspaceDetection as makeWorkspaceDetectionImpl,
  runPolicies as runPoliciesImpl,
  runWorkspacePolicies as runWorkspacePoliciesImpl,
  toPolicies as toPoliciesImpl,
  toWorkspacePolicies as toWorkspacePoliciesImpl
} from "./run.js"

export const makePolicy = makePolicyImpl
export const makeSilentPolicy = makeSilentPolicyImpl
export const makeWorkspacePolicy = makeWorkspacePolicyImpl
export const makeSilentWorkspacePolicy = makeSilentWorkspacePolicyImpl
export const definePolicy = definePolicyImpl
export const defineSilentPolicy = defineSilentPolicyImpl
export const defineWorkspacePolicy = defineWorkspacePolicyImpl
export const defineSilentWorkspacePolicy = defineSilentWorkspacePolicyImpl
export const makeFindings = makeFindingsImpl
export const oneFinding = oneFindingImpl
export const makeDetection = makeDetectionImpl
export const makeWorkspaceDetection = makeWorkspaceDetectionImpl
export const compilerOptionsForPolicies = compilerOptionsForPoliciesImpl
export const toPolicies = toPoliciesImpl
export const toWorkspacePolicies = toWorkspacePoliciesImpl
export const runPolicies = runPoliciesImpl
export const runWorkspacePolicies = runWorkspacePoliciesImpl
