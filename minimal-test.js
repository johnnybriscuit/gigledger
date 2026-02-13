#!/usr/bin/env node

console.log('=== MINIMAL BUILD TEST ===');
console.log('1. Node version:', process.version);
console.log('2. Working directory:', process.cwd());
console.log('3. Testing basic file operations...');

const fs = require('fs');
const path = require('path');

// Test basic file operations
try {
  const testFile = path.join(process.cwd(), 'test-output.txt');
  fs.writeFileSync(testFile, 'test');
  console.log('4. File operations: OK');
  fs.unlinkSync(testFile);
} catch (error) {
  console.log('4. File operations: FAILED -', error.message);
  process.exit(1);
}

console.log('5. Testing npx command...');
const { execSync } = require('child_process');

try {
  const result = execSync('npx --version', { encoding: 'utf8' });
  console.log('6. npx version:', result.trim());
} catch (error) {
  console.log('6. npx command: FAILED -', error.message);
  process.exit(1);
}

console.log('7. Testing expo command...');
try {
  const result = execSync('npx expo --version', { encoding: 'utf8' });
  console.log('8. expo version:', result.trim());
} catch (error) {
  console.log('8. expo command: FAILED -', error.message);
  process.exit(1);
}

console.log('=== ALL TESTS PASSED ===');
