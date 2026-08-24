interface LoadData { id: string }
function load(input: LoadData) { return input.id }
interface SharedData { id: string }
function first(input: SharedData) { return input.id }
function second(input: SharedData) { return input.id }
