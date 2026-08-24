type Handler = () => void
export function apply(callback: Handler): number { callback(); return 1 }
export function acceptUnknownRest(...values: any): void { void values }
