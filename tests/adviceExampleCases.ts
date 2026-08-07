import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"
import { architectureExploreWiring } from "@better-typescript/guidance/architectureExplore/architectureExploreWiring"
import { functionalCoreEffectWiring } from "@better-typescript/guidance/functionalCoreEffect/advice"
import { Wiring } from "@better-typescript/core/engine/wiring/wiringClass"

export interface AdviceExampleCase {
  readonly fixtureId: string
  readonly pairId: string
  readonly title: string
  readonly wiring: Wiring
}

export const adviceExampleCases: ReadonlyArray<AdviceExampleCase> = [
  {
    fixtureId: "high-signal-density",
    pairId: "1",
    title: "high signal density",
    wiring: defaultWiring
  },
  {
    fixtureId: "side-effect-laundering",
    pairId: "1",
    title: "colliding fixes on shared expressions",
    wiring: defaultWiring
  },
  {
    fixtureId: "pipeline-hostile",
    pairId: "1",
    title: "pipeline-hostile module",
    wiring: defaultWiring
  },
  {
    fixtureId: "imperative-state-manager",
    pairId: "1",
    title: "imperative state manager",
    wiring: defaultWiring
  },
  {
    fixtureId: "concept-control",
    pairId: "1",
    title: "closed abstraction cluster",
    wiring: defaultWiring
  },
  {
    fixtureId: "concept-proliferation",
    pairId: "1",
    title: "concept proliferation",
    wiring: defaultWiring
  },
  {
    fixtureId: "hot-subsystem",
    pairId: "1",
    title: "hot subsystem",
    wiring: defaultWiring
  },
  {
    fixtureId: "rule-dominance",
    pairId: "1",
    title: "one rule dominates the run",
    wiring: defaultWiring
  },
  {
    fixtureId: "systemic-hotspots",
    pairId: "1",
    title: "systemic hotspots",
    wiring: defaultWiring
  },
  {
    fixtureId: "deletion-test-shallowness",
    pairId: "1",
    title: "deletion-test shallowness",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "wide-shallow-interface",
    pairId: "1",
    title: "wide shallow interface",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "bounce-cluster",
    pairId: "1",
    title: "bounce cluster",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "leaked-seam",
    pairId: "1",
    title: "leaked seam",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "test-past-interface",
    pairId: "1",
    title: "test past interface",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "hard-to-test-hotspot",
    pairId: "1",
    title: "hard-to-test hotspot",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "hypothetical-seam",
    pairId: "1",
    title: "hypothetical seam",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "effect-orchestrator",
    pairId: "1",
    title: "overgrown Effect orchestrator",
    wiring: functionalCoreEffectWiring
  },
  {
    fixtureId: "adapter-business-logic",
    pairId: "1",
    title: "business logic in an adapter",
    wiring: functionalCoreEffectWiring
  },
  {
    fixtureId: "thick-composition-root",
    pairId: "1",
    title: "thick composition root",
    wiring: functionalCoreEffectWiring
  },
  {
    fixtureId: "pure-service",
    pairId: "1",
    title: "pure service candidate",
    wiring: functionalCoreEffectWiring
  },
  {
    fixtureId: "imperative-core",
    pairId: "1",
    title: "imperative core",
    wiring: functionalCoreEffectWiring
  },
  {
    fixtureId: "registration-ceremony",
    pairId: "1",
    title: "registration ceremony",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "hub-module",
    pairId: "1",
    title: "hub module",
    wiring: architectureExploreWiring
  },
  {
    fixtureId: "duplicated-orchestration",
    pairId: "1",
    title: "duplicated orchestration",
    wiring: architectureExploreWiring
  }
]
