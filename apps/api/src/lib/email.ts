import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? "noreply@jniagri.ag";

// ---------------------------------------------------------------------------
// Shared layout wrapper
// ---------------------------------------------------------------------------
function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FarmerIQ</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Header -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e2e8f0;border-bottom:none;border-radius:8px 8px 0 0;padding:32px 32px 16px;">
              <h1 style="margin:0;color:#0f172a;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                FarmerIQ
              </h1>
              <p style="margin:4px 0 0;color:#64748b;font-size:13px;font-weight:500;">by JNI Agri</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:16px 32px 32px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 0 0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                © ${new Date().getFullYear()} JNI Agri · FarmerIQ Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 1. Invite email — sent when an admin creates a new user account
// ---------------------------------------------------------------------------
export async function sendInviteEmail(
  to: string,
  name: string,
  inviteLink: string
): Promise<void> {
  const html = layout(`
    <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;font-weight:600;">
      Welcome to FarmerIQ, ${name}!
    </h2>
    <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;">
      Your account has been created on the FarmerIQ platform by your administrator.
      Click the button below to set your password and activate your account.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td align="left">
          <a href="${inviteLink}"
             style="display:inline-block;background:#0f172a;color:#ffffff;font-size:14px;font-weight:500;
                    text-decoration:none;border-radius:6px;padding:12px 24px;">
            Set your password
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 24px;word-break:break-all;">
      <a href="${inviteLink}" style="color:#2563eb;font-size:13px;">${inviteLink}</a>
    </p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;">
      <p style="margin:0;color:#475569;font-size:13px;">
        <strong>This link expires in 72 hours.</strong>
        If it expires, ask your administrator to resend the invite.
      </p>
    </div>
  `);

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "You're invited to FarmerIQ — set your password",
    html,
  });

  if (error) {
    console.error("[email] Failed to send invite email:", error);
  }
}

// ---------------------------------------------------------------------------
// 2. Welcome email — sent after a user successfully sets their password
// ---------------------------------------------------------------------------
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const webBase = process.env.WEB_ORIGIN?.split(",")[0]?.trim() ?? "http://localhost:5173";

  const html = layout(`
    <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;font-weight:600;">
      You're all set, ${name}!
    </h2>
    <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;">
      Your FarmerIQ account is now active. You can log in at any time using
      your email address and the password you just created.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td align="left">
          <a href="${webBase}/login"
             style="display:inline-block;background:#0f172a;color:#ffffff;font-size:14px;font-weight:500;
                    text-decoration:none;border-radius:6px;padding:12px 24px;">
            Go to FarmerIQ
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
      If you ever need to change your password, you can do so from your account
      settings after logging in. If you did not expect this email, please contact
      your administrator immediately.
    </p>
  `);

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Your FarmerIQ account is active",
    html,
  });

  if (error) {
    console.error("[email] Failed to send welcome email:", error);
  }
}
