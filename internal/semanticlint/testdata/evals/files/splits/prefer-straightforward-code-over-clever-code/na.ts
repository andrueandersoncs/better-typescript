export type Contact = {
  readonly id: string;
  readonly email: string;
};

export const createContact = (id: string, email: string): Contact => ({
  id,
  email,
});

export const contactEmail = (contact: Contact): string => {
  return contact.email;
};
