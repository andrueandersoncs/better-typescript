export const first = (): number => second()

export const second = (): number => first()

export const firstExternal = () => first()

export const firstExternalTwo = () => first()

export const secondExternal = () => second()
