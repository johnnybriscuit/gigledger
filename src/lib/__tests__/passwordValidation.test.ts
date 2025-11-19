/**
 * Unit tests for password validation
 */

import { validatePassword, validatePasswordServer } from '../passwordValidation';

describe('validatePassword', () => {
  describe('minimum requirements', () => {
    it('should reject passwords shorter than 10 characters', () => {
      const result = validatePassword('Short1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 10 characters');
    });

    it('should reject passwords without letters', () => {
      const result = validatePassword('1234567890');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one letter');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('abcdefghij');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should accept valid password with 10+ chars, letter, and number', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('strength calculation', () => {
    it('should calculate score for basic password', () => {
      const result = validatePassword('password12'); // 10 chars, letter, number
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      // Note: This scores as "fair" due to meeting basic requirements
    });

    it('should rate password with mixed case as fair or better', () => {
      const result = validatePassword('Password123');
      expect(result.strength).not.toBe('weak');
      expect(result.score).toBeGreaterThanOrEqual(40);
    });

    it('should rate good password as good', () => {
      const result = validatePassword('MyPassword123');
      expect(result.strength).toBe('good');
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThan(80);
    });

    it('should rate strong password as strong', () => {
      const result = validatePassword('MyP@ssw0rd!2024');
      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThanOrEqual(80);
    });
  });

  describe('bonus points', () => {
    it('should give bonus for uppercase and lowercase', () => {
      const withMixed = validatePassword('Password123');
      const withoutMixed = validatePassword('password123');
      expect(withMixed.score).toBeGreaterThan(withoutMixed.score);
    });

    it('should give bonus for special characters', () => {
      const withSpecial = validatePassword('Password123!');
      const withoutSpecial = validatePassword('Password123');
      expect(withSpecial.score).toBeGreaterThan(withoutSpecial.score);
    });

    it('should give bonus for longer passwords', () => {
      const longer = validatePassword('MyLongerPassword123');
      const shorter = validatePassword('Password123');
      expect(longer.score).toBeGreaterThan(shorter.score);
    });
  });

  describe('common patterns', () => {
    it('should penalize common patterns', () => {
      const common = validatePassword('123password456');
      const unique = validatePassword('MyPassword789');
      expect(common.score).toBeLessThan(unique.score);
    });

    it('should suggest avoiding common patterns', () => {
      const result = validatePassword('password123');
      expect(result.suggestions.some(s => s.includes('common patterns'))).toBe(true);
    });
  });
});

describe('validatePasswordServer', () => {
  it('should reject passwords shorter than 10 characters', () => {
    const result = validatePasswordServer('Short1');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must be at least 10 characters');
  });

  it('should reject passwords without letters', () => {
    const result = validatePasswordServer('1234567890');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must contain at least one letter');
  });

  it('should reject passwords without numbers', () => {
    const result = validatePasswordServer('abcdefghij');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must contain at least one number');
  });

  it('should accept valid passwords', () => {
    const result = validatePasswordServer('MyPassword123');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should match client-side validation', () => {
    const testCases = [
      'Short1',
      '1234567890',
      'abcdefghij',
      'password123',
      'MyPassword123',
      'MyP@ssw0rd!2024',
    ];

    testCases.forEach(password => {
      const clientResult = validatePassword(password);
      const serverResult = validatePasswordServer(password);
      expect(clientResult.valid).toBe(serverResult.valid);
    });
  });
});
