import { describe, expect, it } from 'vitest';
import {
  BillingAuthorizationError,
  resolveAuthorizedBillingUserId,
} from '../billingSecurity';

describe('billingSecurity', () => {
  it('accepts requests that omit userId and uses the authenticated caller', () => {
    expect(resolveAuthorizedBillingUserId('user-1')).toBe('user-1');
  });

  it('accepts requests when the body userId matches the authenticated caller', () => {
    expect(resolveAuthorizedBillingUserId('user-1', 'user-1')).toBe('user-1');
  });

  it('rejects tampered userId requests', () => {
    expect(() => resolveAuthorizedBillingUserId('user-1', 'user-2')).toThrow(
      BillingAuthorizationError
    );
  });
});
