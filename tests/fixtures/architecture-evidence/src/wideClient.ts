declare const alphaImpl: (value: string) => string
declare const betaImpl: (value: string) => string
declare const gammaImpl: (value: string) => string
declare const deltaImpl: (value: string) => string

export const alpha = (value: string): string => alphaImpl(value)
export const beta = (value: string): string => betaImpl(value)
export const gamma = (value: string): string => gammaImpl(value)
export const delta = (value: string): string => deltaImpl(value)
