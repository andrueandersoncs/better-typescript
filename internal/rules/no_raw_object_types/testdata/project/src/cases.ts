interface Named { value: string }
function violation(input: { value: string }): string { return input.value }
function clean(input: Named): string { return input.value }
void violation
void clean
