import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('Starting monthly limits reset...')
    
    // Reset counters for all non-legacy free users
    const { data, error } = await supabase
      .from('profiles')
      .update({
        gigs_used_this_month: 0,
        expenses_used_this_month: 0,
        invoices_used_this_month: 0,
        exports_used_this_month: 0,
        usage_period_start: new Date().toISOString().split('T')[0],
      })
      .eq('plan', 'free')
      .eq('legacy_free_plan', false)
      .select('id')
    
    if (error) {
      console.error('Error resetting limits:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    const resetCount = data?.length || 0
    console.log(`Successfully reset limits for ${resetCount} users`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reset limits for ${resetCount} free tier users`,
        resetCount 
      }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
