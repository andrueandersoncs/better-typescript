declare const hasPrefix: boolean
declare const prefixNames: ReadonlyArray<string>
declare const mainNames: ReadonlyArray<string>

export const names = [...(hasPrefix ? prefixNames : []), ...mainNames]
