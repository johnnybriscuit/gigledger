import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migrationsDir = join(root, 'supabase', 'migrations');
const schemaPath = join(root, 'supabase', 'schema.sql');
const typesPath = join(root, 'src', 'types', 'database.types.ts');

const migrationSql = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => readFileSync(join(migrationsDir, name), 'utf8'))
  .join('\n');

const schemaSql = readFileSync(schemaPath, 'utf8');
const typeDefs = readFileSync(typesPath, 'utf8');

const checks = [
  { label: 'mfa_backup_codes', pattern: /\bmfa_backup_codes\b/ },
  { label: 'trusted_devices', pattern: /\btrusted_devices\b/ },
  { label: 'security_events', pattern: /\bsecurity_events\b/ },
  { label: 'auth_failures', pattern: /\bauth_failures\b/ },
  { label: 'cleanup_expired_trusted_devices', pattern: /\bcleanup_expired_trusted_devices\b/ },
  { label: 'cleanup_old_auth_failures', pattern: /\bcleanup_old_auth_failures\b/ },
  { label: 'record_auth_failure', pattern: /\brecord_auth_failure\b/ },
  { label: 'clear_auth_failures', pattern: /\bclear_auth_failures\b/ },
  { label: 'is_auth_blocked', pattern: /\bis_auth_blocked\b/ },
];

const failures = [];

for (const check of checks) {
  if (!check.pattern.test(migrationSql)) {
    failures.push(`Active migrations are missing "${check.label}".`);
  }

  if (!check.pattern.test(schemaSql)) {
    failures.push(`supabase/schema.sql is missing "${check.label}".`);
  }

  if (!check.pattern.test(typeDefs)) {
    failures.push(`src/types/database.types.ts is missing "${check.label}".`);
  }
}

if (failures.length > 0) {
  console.error('Schema artifact verification failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Schema artifacts verified.');
