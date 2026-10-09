import { useMemo } from "react"
import { useSession } from "./useSession"
import { useFlags } from "./useFlags"

export type GateResult =
  | { readonly kind: "allowed" }
  | { readonly kind: "denied"; readonly reason: string }

const allowed: GateResult = { kind: "allowed" }

export function evaluateGate(
  flagEnabled: boolean,
  plan: "free" | "pro" | "enterprise",
  betaOptIn: boolean,
): GateResult {
  if (!flagEnabled) {
    return { kind: "denied", reason: "feature disabled" }
  }
  if (plan === "free") {
    if (!betaOptIn) {
      return { kind: "denied", reason: "upgrade or join the beta" }
    }
  }
  return allowed
}

export function useFeatureGate(flag: string): GateResult {
  const session = useSession()
  const flags = useFlags()
  return useMemo(
    () => evaluateGate(flags[flag] === true, session.plan, session.betaOptIn),
    [flags, flag, session.plan, session.betaOptIn],
  )
}
