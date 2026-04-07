import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({
    error: 'Deprecated endpoint',
    message: 'Use the Supabase create-stripe-portal edge function instead.',
  });
}
