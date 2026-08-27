declare const someObj: Chain
const result = someObj.callSomeMethod()
const property = result.accessSomeProperty
someObj.someCall1().someCall2().someCall3()
void property

interface Chain {
  readonly accessSomeProperty: string
  callSomeMethod(): Chain
  someCall1(): Chain
  someCall2(): Chain
  someCall3(): void
}
