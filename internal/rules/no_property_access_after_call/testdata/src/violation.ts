declare const someObj: Chain
const value = someObj.callSomeMethod().accessSomeProperty
void value

interface Chain {
  readonly accessSomeProperty: string
  callSomeMethod(): Chain
}
