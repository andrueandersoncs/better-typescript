declare const Schema: any; declare const Payload: any
function bad(response: any) { return response.json() }
function good(response: any) { return Schema.decodeUnknownEffect(Payload)(response.json()) }
