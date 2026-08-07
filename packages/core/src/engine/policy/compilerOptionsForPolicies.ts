import { Array, flow } from "effect"
import { compilerOptionsForMatchers } from "@better-typescript/matchers/matcher/compilerOptionsForMatchers"
import { policyMatcher } from "./policyMatcher.js"

export const compilerOptionsForPolicies = flow(Array.map(policyMatcher), compilerOptionsForMatchers)
