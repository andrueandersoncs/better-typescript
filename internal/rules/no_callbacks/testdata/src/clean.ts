type Handler = () => void
export function apply(callback: Handler): number { callback(); return 1 }
