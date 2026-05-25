import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)

// Note: RESEND_FROM is set to "onboarding@resend.dev" in development.
// This address can only deliver to the email address registered on the Resend account.
// To send to all family members, add and verify your own domain in Resend.
const FROM = process.env.RESEND_FROM ?? "Familieplanlegger <onboarding@resend.dev>"
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

export function buildInviteEmail({
  email,
  familyName,
  invitedByName,
  token,
}: {
  email: string
  familyName: string
  invitedByName: string
  token: string
}) {
  const link = `${APP_URL}/invite/${token}`

  return {
    from: FROM,
    to: [email],
    subject: `Du er invitert til ${familyName} på Familieplanleggeren`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin-bottom:8px">Hei!</h2>
        <p style="color:#374151;line-height:1.6">
          <strong>${invitedByName}</strong> har invitert deg til å bli med i
          <strong>${familyName}</strong> på Familieplanleggeren.
        </p>
        <p style="margin:24px 0">
          <a href="${link}"
             style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500">
            Bli med i familien
          </a>
        </p>
        <p style="color:#6b7280;font-size:14px;line-height:1.6">
          Lenken er gyldig i 7 dager.<br>
          Hvis du ikke kjenner til denne invitasjonen, kan du ignorere denne e-posten.
        </p>
      </div>
    `,
  }
}
