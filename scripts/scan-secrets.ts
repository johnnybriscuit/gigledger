#!/usr/bin/env tsx

/**
 * Secret Scanner
 * 
 * Scans tracked files for potential secrets and API keys.
 * Exits with code 1 if any secrets are found.
 * 
 * Usage:
 *   npm run scan:secrets
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface SecretPattern {
  name: string;
  pattern: RegExp;
  description: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'Resend API Key',
    pattern: /\bre_[a-zA-Z0-9]{20,}\b/g,
    description: 'Resend API key (starts with re_)',
  },
  {
    name: 'Google API Key',
    pattern: /\bAIza[a-zA-Z0-9_-]{35}\b/g,
    description: 'Google API key (starts with AIza)',
  },
  {
    name: 'Stripe Secret Key',
    pattern: /\bsk_live_[a-zA-Z0-9]{24,}\b/g,
    description: 'Stripe secret key (sk_live_)',
  },
  {
    name: 'Stripe Test Secret Key',
    pattern: /\bsk_test_[a-zA-Z0-9]{24,}\b/g,
    description: 'Stripe test secret key (sk_test_)',
  },
  {
    name: 'Supabase Service Role Key',
    pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    description: 'JWT token (potential service role key)',
  },
  {
    name: 'Generic API Key',
    pattern: /(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
    description: 'Generic API key assignment',
  },
];

// Files and directories to exclude from scanning
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.expo',
  'web-build',
  'coverage',
  '.vercel',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.env.example',
  '.env.local.example',
  'SECURITY_NOTES.md',
  'scripts/scan-secrets.ts', // Don't scan ourselves
];

// File extensions to scan
const SCAN_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.env.example',
  '.env.local.example',
];

interface Finding {
  file: string;
  line: number;
  column: number;
  match: string;
  pattern: SecretPattern;
  context: string;
}

function getTrackedFiles(): string[] {
  try {
    const output = execSync('git ls-files', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error getting tracked files from git:', error);
    process.exit(1);
  }
}

function shouldScanFile(filePath: string): boolean {
  // Check if file is in exclude patterns
  for (const exclude of EXCLUDE_PATTERNS) {
    if (filePath.includes(exclude)) {
      return false;
    }
  }

  // Check if file has a scannable extension
  const ext = path.extname(filePath);
  if (!ext && !filePath.endsWith('.env.example') && !filePath.endsWith('.env.local.example')) {
    return false;
  }

  return SCAN_EXTENSIONS.some(scanExt => filePath.endsWith(scanExt));
}

function scanFile(filePath: string): Finding[] {
  const findings: Finding[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const pattern of SECRET_PATTERNS) {
      // Reset regex state
      pattern.pattern.lastIndex = 0;

      lines.forEach((line, lineIndex) => {
        let match: RegExpExecArray | null;
        
        // Reset regex for each line
        pattern.pattern.lastIndex = 0;
        
        while ((match = pattern.pattern.exec(line)) !== null) {
          // Skip if this looks like a placeholder
          const matchText = match[0];
          if (isPlaceholder(matchText)) {
            continue;
          }

          findings.push({
            file: filePath,
            line: lineIndex + 1,
            column: match.index + 1,
            match: matchText,
            pattern,
            context: line.trim(),
          });
        }
      });
    }
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error);
  }

  return findings;
}

function isPlaceholder(text: string): boolean {
  const placeholderPatterns = [
    /^AIzaSy[X]+$/,
    /^re_[X]+$/,
    /^sk_live_[X]+$/,
    /^sk_test_[X]+$/,
    /XXXXXX/,
    /your[_-]?.*[_-]?here/i,
    /your[_-]?.*[_-]?key/i,
    /placeholder/i,
    /example/i,
    /test.*key/i,
    /demo.*key/i,
  ];

  return placeholderPatterns.some(pattern => pattern.test(text));
}

function printFindings(findings: Finding[]): void {
  if (findings.length === 0) {
    console.log('✅ No secrets found in tracked files.');
    return;
  }

  console.error('\n🚨 POTENTIAL SECRETS FOUND IN TRACKED FILES:\n');

  // Group findings by file
  const findingsByFile = findings.reduce((acc, finding) => {
    if (!acc[finding.file]) {
      acc[finding.file] = [];
    }
    acc[finding.file].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>);

  for (const [file, fileFindings] of Object.entries(findingsByFile)) {
    console.error(`\n📄 ${file}`);
    
    for (const finding of fileFindings) {
      console.error(`   Line ${finding.line}:${finding.column} - ${finding.pattern.name}`);
      console.error(`   Match: ${finding.match}`);
      console.error(`   Context: ${finding.context.substring(0, 100)}${finding.context.length > 100 ? '...' : ''}`);
      console.error('');
    }
  }

  console.error('\n⚠️  ACTION REQUIRED:');
  console.error('   1. Remove these secrets from tracked files');
  console.error('   2. Add them to .env (which is gitignored)');
  console.error('   3. Rotate any exposed keys immediately');
  console.error('   4. See SECURITY_NOTES.md for guidance\n');
}

function main(): void {
  console.log('🔍 Scanning tracked files for secrets...\n');

  const trackedFiles = getTrackedFiles();
  const filesToScan = trackedFiles.filter(shouldScanFile);

  console.log(`Found ${filesToScan.length} files to scan (out of ${trackedFiles.length} tracked files)\n`);

  const allFindings: Finding[] = [];

  for (const file of filesToScan) {
    const findings = scanFile(file);
    allFindings.push(...findings);
  }

  printFindings(allFindings);

  if (allFindings.length > 0) {
    process.exit(1);
  }
}

main();
