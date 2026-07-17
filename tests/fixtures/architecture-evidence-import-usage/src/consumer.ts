import defaultImport, { namedValue, namedCall, aliasedSource as aliasedCall } from "./lib.js"
import * as libNamespace from "./lib.js"

const value = namedValue + defaultImport(1) + namedCall(2) + aliasedCall(3) + libNamespace.nsOnlyCall(4)
const again = namedCall(value)
const namespaceValue = libNamespace.nsOnlyValue
void again
void namespaceValue
