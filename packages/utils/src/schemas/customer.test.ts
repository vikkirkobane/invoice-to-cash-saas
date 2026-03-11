import { describe, it, expect } from 'vitest';
import { customerSchema } from '@invoice/utils/schemas/customer';

describe('Customer Schema', () => {
  it('accepts valid customer', () => {
    const data = { name: 'John Doe', email: 'john@example.com' };
    const result = customerSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = customerSchema.safeParse({ name: 'John', email: 'notanemail' });
    expect(result.success).toBe(false);
  });
});