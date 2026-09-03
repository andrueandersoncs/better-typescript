import { Equivalence } from "effect"
import { Equivalence as LocalEquivalence } from "./local-effect.js"

interface User {
  readonly id: string
}

type Text = string

declare const left: string
declare const right: string

const userIdEqual = Equivalence.strictEqual<string>()
const same = Equivalence.strictEqual<string>()(left, right)
const userEqual = Equivalence.strictEqual<User>()
const aliasEqual = Equivalence.strictEqual<Text>()
const literalEqual = Equivalence.strictEqual<"value">()
const unionEqual = Equivalence.strictEqual<string | number>()
const anyEqual = Equivalence.strictEqual<any>()
const unknownEqual = Equivalence.strictEqual<unknown>()
const neverEqual = Equivalence.strictEqual<never>()

const local = {
  strictEqual: <A>() => (_left: A, _right: A): boolean => true,
}
const localStringEqual = local.strictEqual<string>()
const localNumberEqual = local.strictEqual<number>()
const localModuleStringEqual = LocalEquivalence.strictEqual<string>()
const localModuleNumberEqual = LocalEquivalence.strictEqual<number>()

const nested = () => {
  const stringEqual = Equivalence.strictEqual<string>()
  const booleanEqual = Equivalence.strictEqual<boolean>()
  return { stringEqual, booleanEqual }
}

void userIdEqual
void same
void userEqual
void aliasEqual
void literalEqual
void unionEqual
void anyEqual
void unknownEqual
void neverEqual
void localStringEqual
void localNumberEqual
void localModuleStringEqual
void localModuleNumberEqual
void nested
