export type { SharedType } from "./source.js"
export { sharedValue as valueFromModule } from "./source.js"
export * from "./sourceExtra.js"
export * as source from "./source.js"

import { sharedFunction as importedFunction } from "./source.js"
import sharedDefault from "./defaultSource.js"

export { importedFunction }
export { importedFunction as renamedFunction }
export default sharedDefault
