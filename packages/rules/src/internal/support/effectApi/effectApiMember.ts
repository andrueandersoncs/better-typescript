import { Array, Function, Option, pipe } from "effect"
import { strictEqual } from "../../equivalence.js"
import type { ImportedMember } from "./importedMember.js"

export const effectApiMember =
  (namespace: string) => (names: ReadonlyArray<string>) => (member: ImportedMember) => {
    const lastOption = Array.last(member.path)
    const last = pipe(lastOption, Option.getOrElse(Function.constant("")))
    const pathHead = Array.get(member.path, 0)
    const fromBarrelPath = pipe(pathHead, Option.contains(namespace))
    const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
    const fromBarrel = fromEffectBarrel && fromBarrelPath
    const fromSubpath = strictEqual(`effect/${namespace}`)(member.moduleSpecifier)
    const fromEffectModule = fromBarrel || fromSubpath
    const nameMatches = Array.contains(names, last)
    const matchFlags = Array.make(fromEffectModule, nameMatches)

    return Array.every(matchFlags, Boolean)
  }
