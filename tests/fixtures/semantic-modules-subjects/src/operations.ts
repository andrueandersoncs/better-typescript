import { Detection } from "./subjectA.js"
import { Signal } from "./subjectB.js"
import { WiringSignals } from "./subjectC.js"

// The six equality entities form one private derivation chain that crosses three data subjects.
export const equivalence = <A>(equals: (a: A, b: A) => boolean) => ({
  equals: (left: ReadonlyArray<A>, right: ReadonlyArray<A>) =>
    left.length === right.length && left.every((item, index) => equals(item, right[index]!))
})

export const detectionEquals = (a: Detection, b: Detection) =>
  a.path === b.path && a.line === b.line && a.data === b.data

export const detectionsEquivalence = equivalence(detectionEquals)

export const signalEquals = (a: Signal, b: Signal) =>
  a.name === b.name && detectionsEquivalence.equals(a.detections, b.detections)

const signalArrayEquivalence = equivalence(signalEquals)

export const wiringSignalsEquals = (a: WiringSignals, b: WiringSignals) =>
  a.matched === b.matched && signalArrayEquivalence.equals(a.signals, b.signals)

const wiringSignalsArrayEquivalence = equivalence(wiringSignalsEquals)

void wiringSignalsArrayEquivalence

// A binary helper without a verdict result is ordinary plumbing, so it owns no subject.
export const orderedDetections = (a: Detection, b: Detection): ReadonlyArray<Detection> =>
  a.line <= b.line ? [a, b] : [b, a]

// A one-operand predicate stays unowned because a subject needs at least two operands.
export const detectionIsBlank = (a: Detection): boolean => a.path.length === 0
