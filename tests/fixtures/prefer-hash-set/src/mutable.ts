import { HashSet, MutableHashSet as MutableSet } from "effect" // ~detect 19
import * as DirectMutableSet from "effect/MutableHashSet" // ~detect 35
import * as Effect from "effect"

const fromBarrel = MutableSet.empty<string>()
const fromSubpath = DirectMutableSet.empty<string>()
const fromNamespace = Effect.MutableHashSet.empty<string>() // ~detect 30
const immutable = HashSet.empty<string>()

void fromBarrel
void fromSubpath
void fromNamespace
void immutable
