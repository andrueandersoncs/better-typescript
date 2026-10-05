type Handler = () => void
export function subscribe(callback: Handler): void { callback() }
export const subscribeInline = (callback: Handler): void => { callback() }
