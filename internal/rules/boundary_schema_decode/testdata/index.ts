declare const Schema: any; declare const Person: any;
function bad(request: any) { return request.json() }
function good(request: any) { const raw = request.json(); return Schema.decodeUnknownEffect(Person)(raw) }
function defect() { return JSON.parse("{") }
