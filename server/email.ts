import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || smtpUser;

const transporter =
  smtpHost && smtpFrom
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth:
          smtpUser && smtpPass
            ? {
                user: smtpUser,
                pass: smtpPass,
              }
            : undefined,
      })
    : null;

export async function sendPasswordResetEmail(to: string, token: string) {
  const appBaseUrl =
    process.env.APP_BASE_URL || "http://localhost:5000";

  const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(
    token,
  )}`;

  if (!transporter) {
    console.log(
      `[Email Mock] SMTP not configured. Password reset link for ${to}: ${resetUrl}`,
    );
    return;
  }

  await transporter.sendMail({
    from: smtpFrom!,
    to,
    subject: "Reset your Picapex password",
    text: `You requested a password reset.\n\nClick the link below to choose a new password:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to choose a new password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

