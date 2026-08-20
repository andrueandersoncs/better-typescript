import { HashMap, MutableHashMap as MutableMap } from "effect" // ~detect 19
import * as DirectMutableMap from "effect/MutableHashMap" // ~detect 35
import * as Effect from "effect"

const fromBarrel = MutableMap.empty<string, number>()
const fromSubpath = DirectMutableMap.empty<string, number>()
const fromNamespace = Effect.MutableHashMap.empty<string, number>() // ~detect 30
const immutable = HashMap.empty<string, number>()

void fromBarrel
void fromSubpath
void fromNamespace
void immutable
