import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function toICSDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`
}

function escapeICS(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    if (!token) {
      return new Response('Missing token', { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: shareLink, error: linkError } = await supabase
      .from('shared_schedule_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (linkError || !shareLink) {
      return new Response('Not found', { status: 404 })
    }

    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return new Response('Gone', { status: 410 })
    }

    const today = new Date().toISOString().split('T')[0]

    const { data: gigs, error: gigsError } = await supabase
      .from('gigs')
      .select('id, date, title, location, city, state, gross_amount, payer:payers(name)')
      .eq('user_id', shareLink.user_id)
      .gte('date', today)
      .order('date', { ascending: true })

    if (gigsError) {
      return new Response('Server error', { status: 500 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', shareLink.user_id)
      .single()

    const displayName = shareLink.display_name || profile?.full_name || 'Shared Schedule'

    const eventBlocks = (gigs ?? []).map((gig: any) => {
      const payerName = gig.payer?.name ?? 'Gig'
      const summary = escapeICS(`${payerName} gig`)
      const desc = gig.gross_amount != null
        ? `Take-home\\: $${gig.gross_amount}`
        : ''
      const locationParts = [gig.location, gig.city, gig.state].filter(Boolean)
      const location = locationParts.length > 0 ? escapeICS(locationParts.join(', ')) : ''

      const lines = [
        'BEGIN:VEVENT',
        `UID:${gig.id}@bozzygigs.com`,
        `DTSTART;VALUE=DATE:${toICSDate(gig.date)}`,
        `SUMMARY:${summary}`,
      ]
      if (desc) lines.push(`DESCRIPTION:${desc}`)
      if (location) lines.push(`LOCATION:${location}`)
      lines.push('STATUS:TENTATIVE', 'END:VEVENT')
      return lines.join('\r\n')
    })

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bozzy//Gig Schedule//EN',
      `X-WR-CALNAME:${escapeICS(displayName)}`,
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      'X-PUBLISHED-TTL:PT1H',
      ...eventBlocks,
      'END:VCALENDAR',
    ].join('\r\n')

    return new Response(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': 'attachment; filename="gig-schedule.ics"',
      },
    })
  } catch (err) {
    console.error('[schedule-ics] error:', err)
    return new Response('Server error', { status: 500 })
  }
})
