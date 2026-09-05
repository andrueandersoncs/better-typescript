interface Named { value: string }
function violation(input: { value: string }): string { return input.value }
function clean(input: Named): string { return input.value }
void violation
void clean
export const make = <Tag extends string, Payload>(
  definition: { readonly tag: Tag; readonly payload: Payload },
): readonly [Tag, Payload] => [definition.tag, definition.payload]
