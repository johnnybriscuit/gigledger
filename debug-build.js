#!/usr/bin/env node

console.log('🔍 DEBUG: Starting build process');
console.log('🔍 DEBUG: Node version:', process.version);
console.log('🔍 DEBUG: Current directory:', process.cwd());
console.log('🔍 DEBUG: Environment variables:', Object.keys(process.env).filter(k => k.includes('EXPO') || k.includes('NODE')).join(', '));

const { spawn } = require('child_process');

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 DEBUG: Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      console.log(`🔍 DEBUG: Command completed with code: ${code}`);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.log(`🔍 DEBUG: Command error: ${error.message}`);
      reject(error);
    });
  });
}

async function debugBuild() {
  try {
    console.log('🔍 DEBUG: Starting Expo export...');
    await runCommand('npx', ['expo', 'export', '--platform', 'web']);
    console.log('🔍 DEBUG: Expo export completed successfully');
  } catch (error) {
    console.error('🔍 DEBUG: Build failed:', error.message);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    process.exit(1);
  }
}

debugBuild();
