#!/usr/bin/env node

console.log('🔍 Testing environment variables...');

const requiredEnvVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_DEEP_LINK_SCHEME',
  'EXPO_PUBLIC_DEFAULT_MILEAGE_RATE',
  'EXPO_PUBLIC_SITE_URL',
  'EXPO_PUBLIC_TAX_YEAR',
  'EXPO_PUBLIC_FEDERAL_FLAT_RATE_SINGLE',
  'EXPO_PUBLIC_FEDERAL_FLAT_RATE_MARRIED',
  'EXPO_PUBLIC_FEDERAL_FLAT_RATE_HOH',
  'EXPO_PUBLIC_USE_FEDERAL_BRACKETS'
];

console.log('Checking environment variables:');
let missingVars = [];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log(`\n🚨 Missing ${missingVars.length} environment variables:`);
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log('\nThis is likely causing the build failure.');
  process.exit(1);
} else {
  console.log('\n✅ All environment variables present');
  console.log('Running expo export...');
  
  const { spawn } = require('child_process');
  const child = spawn('npx', ['expo', 'export', '--platform', 'web'], {
    stdio: 'inherit'
  });
  
  child.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Expo export completed successfully');
    } else {
      console.log(`❌ Expo export failed with code ${code}`);
      process.exit(code);
    }
  });
}
