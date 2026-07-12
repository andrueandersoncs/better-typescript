import { Array as EffectArray } from "effect"

export {}

const made = EffectArray.make(1, 2, 3)

const ofOne = EffectArray.of(1)

const emptied = EffectArray.empty<number>()

const allocated = EffectArray.allocate<number>(3)

const fromIter = EffectArray.fromIterable(made)

const isArr = Array.isArray(made)

const fromStatic = Array.from(made)

const typed = new Uint8Array(4)

namespace ns {
  export class Array {
    constructor(readonly n: number) {}
  }
}

const namespaced = new ns.Array(1)

void made
void ofOne
void emptied
void allocated
void fromIter
void isArr
void fromStatic
void typed
void namespaced
