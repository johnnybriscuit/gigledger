import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReceiptExtractionResult {
  vendor?: string
  date?: string
  total?: number
  currency?: string
  rawText?: string
  lineItems?: any[]
  provider: string
}

interface CategorySuggestion {
  category: string
  confidence: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const { expenseId } = await req.json()
    if (!expenseId) {
      throw new Error('Missing expenseId')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { data: expense, error: expenseError } = await supabaseClient
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('user_id', user.id)
      .single()

    if (expenseError || !expense) {
      return new Response(
        JSON.stringify({ error: 'Expense not found or access denied' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (!expense.receipt_url && !expense.receipt_storage_path) {
      throw new Error('No receipt file found for this expense')
    }

    const receiptPath = expense.receipt_storage_path || expense.receipt_url
    if (!receiptPath) {
      throw new Error('Receipt path is empty')
    }

    await supabaseClient
      .from('expenses')
      .update({ receipt_extraction_status: 'pending' })
      .eq('id', expenseId)

    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('receipts')
      .download(receiptPath)

    if (downloadError || !fileData) {
      await supabaseClient
        .from('expenses')
        .update({
          receipt_extraction_status: 'failed',
          receipt_extraction_error: 'Failed to download receipt file'
        })
        .eq('id', expenseId)
      throw new Error('Failed to download receipt file')
    }

    const fileBytes = new Uint8Array(await fileData.arrayBuffer())
    const sha256Hash = await computeSHA256(fileBytes)

    const { data: duplicates } = await supabaseClient
      .from('expenses')
      .select('id, description, date')
      .eq('user_id', user.id)
      .eq('receipt_sha256', sha256Hash)
      .neq('id', expenseId)
      .limit(1)

    const duplicateSuspected = duplicates && duplicates.length > 0

    const mimeType = expense.receipt_mime || guessMimeType(receiptPath)

    const extractionResult = await extractReceipt({
      bytes: fileBytes,
      mimeType
    })

    if (extractionResult.provider === 'disabled') {
      await supabaseClient
        .from('expenses')
        .update({
          receipt_extraction_status: 'failed',
          receipt_extraction_error: 'Receipt scanning is not enabled. Please configure an OCR provider.',
          receipt_sha256: sha256Hash,
          receipt_storage_path: receiptPath,
          receipt_mime: mimeType
        })
        .eq('id', expenseId)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Receipt scanning not enabled',
          message: 'Receipt scanning is not configured. You can still add expenses manually.',
          duplicate_suspected: duplicateSuspected
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const categorySuggestion = suggestExpenseCategory({
      vendor: extractionResult.vendor,
      total: extractionResult.total,
      rawText: extractionResult.rawText
    })

    const updateData = {
      receipt_extraction_status: 'succeeded',
      receipt_extracted_at: new Date().toISOString(),
      receipt_extraction_error: null,
      receipt_extracted_json: extractionResult,
      receipt_vendor: extractionResult.vendor || null,
      receipt_total: extractionResult.total || null,
      receipt_currency: extractionResult.currency || 'USD',
      receipt_date: extractionResult.date || null,
      category_suggestion: categorySuggestion.category,
      category_confidence: categorySuggestion.confidence,
      receipt_sha256: sha256Hash,
      receipt_storage_path: receiptPath,
      receipt_mime: mimeType
    }

    await supabaseClient
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)

    return new Response(
      JSON.stringify({
        success: true,
        extracted: {
          vendor: extractionResult.vendor,
          date: extractionResult.date,
          total: extractionResult.total,
          currency: extractionResult.currency
        },
        suggestion: categorySuggestion,
        duplicate_suspected: duplicateSuspected,
        provider: extractionResult.provider
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Receipt processing error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

async function extractReceipt({ bytes, mimeType }: { bytes: Uint8Array; mimeType: string }): Promise<ReceiptExtractionResult> {
  const provider = Deno.env.get('RECEIPT_OCR_PROVIDER') || 'disabled'

  if (provider === 'disabled') {
    return { provider: 'disabled' }
  }

  if (provider === 'mindee') {
    return await extractWithMindee(bytes, mimeType)
  }

  if (provider === 'google') {
    return await extractWithGoogleVision(bytes, mimeType)
  }

  return { provider: 'disabled' }
}

async function extractWithMindee(bytes: Uint8Array, mimeType: string): Promise<ReceiptExtractionResult> {
  const apiKey = Deno.env.get('MINDEE_API_KEY')
  if (!apiKey) {
    return { provider: 'disabled' }
  }

  const formData = new FormData()
  const blob = new Blob([bytes], { type: mimeType })
  formData.append('document', blob, 'receipt')

  const response = await fetch('https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`
    },
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Mindee API error: ${response.statusText}`)
  }

  const result = await response.json()
  const prediction = result.document?.inference?.prediction

  if (!prediction) {
    throw new Error('No prediction data from Mindee')
  }

  return {
    vendor: prediction.supplier_name?.value || undefined,
    date: prediction.date?.value || undefined,
    total: prediction.total_amount?.value || undefined,
    currency: prediction.locale?.currency || 'USD',
    rawText: prediction.raw_text || undefined,
    lineItems: prediction.line_items || [],
    provider: 'mindee'
  }
}

async function extractWithGoogleVision(bytes: Uint8Array, mimeType: string): Promise<ReceiptExtractionResult> {
  const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY')
  if (!apiKey) {
    return { provider: 'disabled' }
  }

  const base64Image = btoa(String.fromCharCode(...bytes))

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [{
        image: { content: base64Image },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
      }]
    })
  })

  if (!response.ok) {
    throw new Error(`Google Vision API error: ${response.statusText}`)
  }

  const result = await response.json()
  const textAnnotations = result.responses?.[0]?.textAnnotations

  if (!textAnnotations || textAnnotations.length === 0) {
    throw new Error('No text detected in receipt')
  }

  const rawText = textAnnotations[0].description
  const parsed = parseReceiptText(rawText)

  return {
    vendor: parsed.vendor,
    date: parsed.date,
    total: parsed.total,
    currency: 'USD',
    rawText,
    provider: 'google'
  }
}

function parseReceiptText(text: string): { vendor?: string; date?: string; total?: number } {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  
  const vendor = lines[0] || undefined
  
  const dateRegex = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})|(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/
  const dateMatch = text.match(dateRegex)
  const date = dateMatch ? dateMatch[0] : undefined
  
  const totalRegex = /(?:total|amount|sum)[\s:$]*(\d+[.,]\d{2})/i
  const totalMatch = text.match(totalRegex)
  let total: number | undefined
  if (totalMatch) {
    total = parseFloat(totalMatch[1].replace(',', '.'))
  } else {
    const amountRegex = /\$?\s*(\d+[.,]\d{2})/g
    const amounts: number[] = []
    let match
    while ((match = amountRegex.exec(text)) !== null) {
      amounts.push(parseFloat(match[1].replace(',', '.')))
    }
    if (amounts.length > 0) {
      total = Math.max(...amounts)
    }
  }

  return { vendor, date, total }
}

function suggestExpenseCategory({ vendor, total, rawText }: { vendor?: string; total?: number; rawText?: string }): CategorySuggestion {
  const text = `${vendor || ''} ${rawText || ''}`.toLowerCase()

  const patterns = [
    { keywords: ['uber', 'lyft', 'taxi', 'cab'], category: 'Travel', confidence: 0.75 },
    { keywords: ['airbnb', 'marriott', 'hilton', 'hotel', 'motel', 'inn', 'lodge'], category: 'Lodging', confidence: 0.8 },
    { keywords: ['southwest', 'delta', 'united', 'american airlines', 'jetblue', 'spirit', 'frontier', 'airline', 'flight'], category: 'Travel', confidence: 0.8 },
    { keywords: ['guitar center', 'sweetwater', 'sam ash', 'musicians friend', 'music store'], category: 'Equipment/Gear', confidence: 0.85 },
    { keywords: ['apple', 'adobe', 'spotify', 'google', 'microsoft', 'dropbox', 'zoom', 'slack', 'subscription'], category: 'Software/Subscriptions', confidence: 0.7 },
    { keywords: ['restaurant', 'cafe', 'coffee', 'starbucks', 'dunkin', 'mcdonald', 'burger', 'pizza', 'food', 'dining'], category: 'Meals & Entertainment', confidence: 0.65 },
    { keywords: ['office depot', 'staples', 'amazon', 'target', 'walmart', 'supplies'], category: 'Supplies', confidence: 0.6 },
    { keywords: ['facebook ads', 'google ads', 'instagram', 'marketing', 'advertising', 'promotion'], category: 'Marketing/Promotion', confidence: 0.75 },
    { keywords: ['lawyer', 'attorney', 'accountant', 'cpa', 'consultant', 'professional'], category: 'Professional Fees', confidence: 0.8 },
    { keywords: ['course', 'training', 'education', 'workshop', 'seminar', 'class', 'udemy', 'coursera'], category: 'Education/Training', confidence: 0.75 },
    { keywords: ['rent', 'lease', 'studio', 'rehearsal space', 'storage'], category: 'Rent/Studio', confidence: 0.8 }
  ]

  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      if (text.includes(keyword)) {
        return { category: pattern.category, confidence: pattern.confidence }
      }
    }
  }

  return { category: 'Other', confidence: 0.3 }
}

async function computeSHA256(bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'heif': 'image/heif'
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}
