/**
 * Generate a payment reference number in format: PMT-YYYYMMDD-XXXXXX
 * where XXXXXX is a 6-character uppercase base32 string (A-Z, 2-7)
 * 
 * Uses crypto.getRandomValues for secure randomness when available,
 * falls back to Math.random if not available.
 */
export function generatePaymentRef(date?: string): string {
  // Use provided date or current date
  const paymentDate = date ? new Date(date) : new Date();
  const year = paymentDate.getFullYear();
  const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
  const day = String(paymentDate.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Base32 alphabet (uppercase, no confusing characters like 0, O, 1, I)
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  
  // Generate 6 random characters
  let randomStr = '';
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Crypto-safe random for web
    const randomBytes = new Uint8Array(6);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 6; i++) {
      randomStr += base32Chars[randomBytes[i] % base32Chars.length];
    }
  } else {
    // Fallback to Math.random
    for (let i = 0; i < 6; i++) {
      randomStr += base32Chars[Math.floor(Math.random() * base32Chars.length)];
    }
  }

  return `PMT-${dateStr}-${randomStr}`;
}
