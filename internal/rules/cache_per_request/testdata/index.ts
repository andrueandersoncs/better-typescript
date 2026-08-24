declare const Cache: any;
function handler(request: string) { return Cache.make({ lookup: () => request }) }
const shared = () => Cache.make({ lookup: () => 1 })
