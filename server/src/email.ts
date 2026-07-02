import { Resend } from 'resend'

/**
 * Надсилає лист із кодом підтвердження через Resend.
 * Без RESEND_API_KEY код друкується в консоль — щоб dev-флоу працював без пошти.
 */
export async function sendVerificationCode(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM || 'Acme Corp. Data Room <onboarding@resend.dev>'

  if (!apiKey) {
    console.log(`\n[email] (dev) Код підтвердження для ${email}: ${code}\n`)
    return
  }

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from,
    to: email,
    subject: `${code} — код підтвердження Acme Corp. Data Room`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:440px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 4px;color:#1f2430">Acme Corp. Data Room</h2>
        <p style="color:#6b7280;margin:0 0 24px">Підтвердження електронної пошти</p>
        <p style="color:#111827;margin:0 0 12px">Ваш код підтвердження:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;
                    background:#f5a52415;border:1px solid #f5a52440;border-radius:12px;
                    padding:16px;text-align:center">${code}</div>
        <p style="color:#6b7280;font-size:13px;margin:16px 0 0">
          Код дійсний 15 хвилин. Якщо це були не ви — просто проігноруйте лист.
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('[email] Resend send error:', JSON.stringify(error))
    throw new Error(`Resend: ${error.message || 'send failed'}`)
  }
  console.log(`[email] Код надіслано на ${email} (id: ${data?.id})`)
}
