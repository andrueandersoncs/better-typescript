import { HashSet, MutableHashSet as MutableSet } from "effect"
import * as DirectMutableSet from "effect/MutableHashSet"
import * as Effect from "effect"

const fromBarrel = MutableSet.empty<string>()
const fromSubpath = DirectMutableSet.empty<string>()
const fromNamespace = Effect.MutableHashSet.empty<string>()
const immutable = HashSet.empty<string>()

void fromBarrel
void fromSubpath
void fromNamespace
void immutable
