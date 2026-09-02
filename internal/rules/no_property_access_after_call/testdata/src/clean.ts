declare const someObj: Chain
const result = someObj.callSomeMethod()
void result.accessSomeProperty
someObj.someCall1().someCall2().someCall3()

interface Chain {
  readonly accessSomeProperty: string
  callSomeMethod(): Chain
  someCall1(): Chain
  someCall2(): Chain
  someCall3(): void
}
