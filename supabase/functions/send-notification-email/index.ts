type EmailPayload = {
  to?: string
  subject?: string
  title?: string
  message?: string
  template?: Partial<EmailTemplate>
}

type EmailTemplate = {
  brandName: string
  headerImageUrl: string
  backgroundColor: string
  cardColor: string
  textColor: string
  accentColor: string
  fontSize: number
  footerText: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-edge-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const defaultTemplate: EmailTemplate = {
  brandName: 'InternHiring',
  headerImageUrl: '',
  backgroundColor: '#f8fafc',
  cardColor: '#ffffff',
  textColor: '#334155',
  accentColor: '#2563eb',
  fontSize: 15,
  footerText: 'Email nay duoc gui tu he thong thong bao InternHiring.',
}

const safeColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback

const safeText = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const safeImageUrl = (value: unknown) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/') ? trimmed : ''
}

const normalizeTemplate = (input?: Partial<EmailTemplate>): EmailTemplate => ({
  brandName: safeText(input?.brandName, defaultTemplate.brandName),
  headerImageUrl: safeImageUrl(input?.headerImageUrl),
  backgroundColor: safeColor(input?.backgroundColor, defaultTemplate.backgroundColor),
  cardColor: safeColor(input?.cardColor, defaultTemplate.cardColor),
  textColor: safeColor(input?.textColor, defaultTemplate.textColor),
  accentColor: safeColor(input?.accentColor, defaultTemplate.accentColor),
  fontSize:
    typeof input?.fontSize === 'number'
      ? Math.max(12, Math.min(20, Math.round(input.fontSize)))
      : defaultTemplate.fontSize,
  footerText: safeText(input?.footerText, defaultTemplate.footerText),
})

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: corsHeaders})
  }

  if (req.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405)
  }

  const edgeSecret = Deno.env.get('EDGE_FUNCTION_SECRET')
  const requestSecret = req.headers.get('x-edge-secret')

  if (!edgeSecret || requestSecret !== edgeSecret) {
    return jsonResponse({error: 'Unauthorized'}, 401)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM') || 'InternHiring <onboarding@resend.dev>'

  if (!resendApiKey) {
    return jsonResponse({error: 'RESEND_API_KEY is not configured'}, 500)
  }

  let payload: EmailPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({error: 'Invalid JSON body'}, 400)
  }

  const to = payload.to?.trim()
  const subject = payload.subject?.trim()
  const title = payload.title?.trim() || subject
  const message = payload.message?.trim()

  if (!to || !subject || !title || !message) {
    return jsonResponse({error: 'Missing to, subject, title, or message'}, 400)
  }

  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />')
  const template = normalizeTemplate(payload.template)
  const headerImage = template.headerImageUrl
    ? `<img src="${escapeHtml(template.headerImageUrl)}" alt="" style="display:block;width:100%;max-width:100%;height:auto;max-height:260px;object-fit:contain;border-radius:10px;margin-bottom:20px;" />`
    : ''

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html: `
        <div style="margin:0;padding:24px;background:${template.backgroundColor};font-family:Arial,sans-serif;">
        <div style="max-width:620px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:${template.cardColor};">
          ${headerImage}
          <div style="font-size:13px;font-weight:700;color:${template.accentColor};margin-bottom:16px;">${escapeHtml(template.brandName)}</div>
          <h1 style="font-size: 22px; line-height: 1.35; color: #0f172a; margin: 0 0 12px;">${safeTitle}</h1>
          <p style="font-size:${template.fontSize}px;line-height:1.7;color:${template.textColor};margin:0;">${safeMessage}</p>
          <div style="height: 1px; background: #e2e8f0; margin: 24px 0;"></div>
          <p style="font-size:12px;color:#64748b;margin:0;">${escapeHtml(template.footerText)}</p>
        </div>
        </div>
      `,
      text: `${title}\n\n${message}`,
    }),
  })

  const resendBody = await resendResponse.text()

  if (!resendResponse.ok) {
    return jsonResponse({error: 'Resend request failed', details: resendBody}, 502)
  }

  let details: unknown = resendBody
  try {
    details = JSON.parse(resendBody)
  } catch {
    details = resendBody
  }

  return jsonResponse({ok: true, details})
})
