export type Reference = {
  readonly value: string;
};

export const createReference = (value: string): Reference => ({
  value,
});

export const referenceValue = (reference: Reference): string => {
  return reference.value;
};

export const defaultReference = (): Reference => createReference("invoice-17");
