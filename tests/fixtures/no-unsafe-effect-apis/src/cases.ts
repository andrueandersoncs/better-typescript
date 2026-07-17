import { HashMap, Ref } from "effect"
import * as EffectRef from "effect/Ref"
import { makeUnsafe as createRef, makeUnsafe as makeRefUnsafe } from "effect/Ref"
import { unsafeSecureJsonParse } from "effect/unstable/ai/Tool"
import { makeUnsafe as reexportedMakeUnsafe } from "./reexport.js"

const empty = HashMap.empty<string, number>()

export const refDirect = Ref.makeUnsafe(0)
export const refNamespace = EffectRef.makeUnsafe(1)
export const refRenamed = makeRefUnsafe(2)
export const refReexport = reexportedMakeUnsafe(3)
export const refAlias = makeRefUnsafe
export const mapGetUnsafe = HashMap.getUnsafe(empty, "k")
export const mapElement = HashMap["getUnsafe"](empty, "k")
export const refGetUnsafe = Ref.getUnsafe(refDirect)
export const lowercaseUnsafe = unsafeSecureJsonParse("{}")
export const refOpaqueAlias = createRef(4)
