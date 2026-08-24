type Handler = () => void
export function subscribe(callback: Handler): void { callback() }
