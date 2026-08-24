interface LoadInput { id: string }
function load(input: LoadInput) { return input.id }
interface UserRequest { id: string }
function send(input: UserRequest) { return input.id }
const { prototype } = function () {}
