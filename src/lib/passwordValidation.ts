/**
 * Password validation and strength calculation
 * Requirements: min 10 chars, at least 1 letter + 1 number
 */

export interface PasswordValidationResult {
  valid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Required: minimum length
  if (password.length < 10) {
    errors.push('Password must be at least 10 characters');
  } else {
    score += 25;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
  }

  // Required: at least one letter
  const hasLetter = /[a-zA-Z]/.test(password);
  if (!hasLetter) {
    errors.push('Password must contain at least one letter');
  } else {
    score += 20;
  }

  // Required: at least one number
  const hasNumber = /\d/.test(password);
  if (!hasNumber) {
    errors.push('Password must contain at least one number');
  } else {
    score += 20;
  }

  // Bonus: uppercase and lowercase
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  if (hasUppercase && hasLowercase) {
    score += 10;
  } else {
    suggestions.push('Use both uppercase and lowercase letters');
  }

  // Bonus: special characters
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (hasSpecial) {
    score += 15;
  } else {
    suggestions.push('Add special characters for extra security');
  }

  // Check for common patterns
  const commonPatterns = [
    /^123/,
    /password/i,
    /qwerty/i,
    /abc/i,
    /111/,
    /000/,
  ];
  
  const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
  if (hasCommonPattern) {
    score = Math.max(0, score - 20);
    suggestions.push('Avoid common patterns like "123" or "password"');
  }

  // Determine strength level
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score < 40) {
    strength = 'weak';
  } else if (score < 60) {
    strength = 'fair';
  } else if (score < 80) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  const valid = errors.length === 0;

  return {
    valid,
    strength,
    score: Math.min(100, score),
    errors,
    suggestions,
  };
}

/**
 * Server-side validation (same logic, for double-checking)
 */
export function validatePasswordServer(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 10) {
    return { valid: false, error: 'Password must be at least 10 characters' };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }

  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  return { valid: true };
}
