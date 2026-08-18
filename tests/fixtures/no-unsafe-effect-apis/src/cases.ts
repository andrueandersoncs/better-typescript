import { HashMap, Ref } from "effect"
import * as EffectRef from "effect/Ref"
import { makeUnsafe as createRef, makeUnsafe as makeRefUnsafe } from "effect/Ref"
import { unsafeSecureJsonParse } from "effect/unstable/ai/Tool"
import { makeUnsafe as reexportedMakeUnsafe } from "./reexport.js"

const empty = HashMap.empty<string, number>()

export const refDirect = Ref.makeUnsafe(0) // ~detect 26
export const refNamespace = EffectRef.makeUnsafe(1) // ~detect 29
export const refRenamed = makeRefUnsafe(2) // ~detect 27
export const refReexport = reexportedMakeUnsafe(3) // ~detect 28
export const refAlias = makeRefUnsafe // ~detect 25
export const mapGetUnsafe = HashMap.getUnsafe(empty, "k") // ~detect 29
export const mapElement = HashMap["getUnsafe"](empty, "k") // ~detect 27
export const refGetUnsafe = Ref.getUnsafe(refDirect) // ~detect 29
export const lowercaseUnsafe = unsafeSecureJsonParse("{}") // ~detect 32
export const refOpaqueAlias = createRef(4) // ~detect 31
