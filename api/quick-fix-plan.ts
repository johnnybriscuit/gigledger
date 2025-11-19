/**
 * Quick Fix: Manually set plan to pro_monthly
 * Bypasses all Stripe checks and just updates the database
 * USE THIS ONLY AS A TEMPORARY FIX
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Quick fix: Setting plan to pro_monthly for user:', user.id);

    // Just update the plan, no Stripe checks
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plan: 'pro_monthly' })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw profileError;
    }

    console.log('Plan updated successfully to pro_monthly');

    return res.status(200).json({
      success: true,
      plan: 'pro_monthly',
      message: 'Plan manually set to pro_monthly. Please verify your subscription in Stripe.',
    });

  } catch (error: any) {
    console.error('Error in quick fix:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Failed to update plan'
    });
  }
}
