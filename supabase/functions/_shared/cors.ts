export const ALLOWED_ORIGINS = [
  'https://bozzygigs.com',
  'https://www.bozzygigs.com',
  'https://gigledger-ten.vercel.app',
  'http://localhost:8090',
  'http://localhost:8081',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
