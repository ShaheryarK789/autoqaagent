import { randomBytes } from 'node:crypto';

// Catalogue facts observed during exploration; expectations are recomputed from these.
export const PRODUCTS = {
  combinationPliers: { id: 1, name: 'Combination Pliers', price: 14.15 },
  pliers: { id: 2, name: 'Pliers', price: 12.01 },
  longNosePliers: { id: 4, name: 'Long Nose Pliers', price: 14.24 },
  slipJointPliers: { id: 5, name: 'Slip Joint Pliers', price: 9.17 },
} as const;

// Profile used for throwaway customers. Nothing here is a secret.
export const CUSTOMER = {
  firstName: 'Qa',
  lastName: 'Tester',
  dob: '1990-01-15',
  address: '1 Test Street',
  postcode: '12345',
  city: 'Testville',
  state: 'Teststate',
  country: 'Netherlands',
  phone: '0612345678',
} as const;

// Obviously fake bank transfer details; the app accepts any values.
export const BANK_TRANSFER = { accountName: 'Test Account', accountNumber: '123456789' } as const;

export const CONTACT_MESSAGE =
  'This is an automated QA test message, please ignore it. Thank you very much.';

export function uniqueEmail(tag: string): string {
  return `autoqa+${tag}.${Date.now()}.${randomBytes(3).toString('hex')}@example.test`;
}

// Generated per run and kept in memory only; never written to disk.
export function generatePassword(): string {
  return `Qa!${randomBytes(9).toString('base64url')}9z`;
}

export function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function lineTotal(price: number, quantity: number): number {
  return Math.round(price * 100 * quantity) / 100;
}
