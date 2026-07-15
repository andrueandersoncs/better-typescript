import { HashMap, MutableHashMap as MutableMap } from "effect"
import * as DirectMutableMap from "effect/MutableHashMap"
import * as Effect from "effect"

const fromBarrel = MutableMap.empty<string, number>()
const fromSubpath = DirectMutableMap.empty<string, number>()
const fromNamespace = Effect.MutableHashMap.empty<string, number>()
const immutable = HashMap.empty<string, number>()

void fromBarrel
void fromSubpath
void fromNamespace
void immutable
