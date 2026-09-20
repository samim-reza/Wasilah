/**
 * Sending reminder email.
 *
 * Why this exists at all: the web app cannot schedule a local notification and
 * cannot hold a push token, so the reminder that makes this app work has no
 * delivery channel there. Email is that channel.
 *
 * Two providers, chosen by which secret is configured, because the right one
 * is not knowable in advance:
 *
 *   RESEND_API_KEY  → plain HTTPS. Always works from a serverless runtime.
 *   SMTP_PASS       → SMTP to Titan, reusing the mailbox that already exists.
 *
 * SMTP is tried only if Resend is not configured. Outbound SMTP from Deno
 * Deploy is not guaranteed — the platform may refuse the connection, and when
 * it does it fails at connect time rather than silently. Supporting both means
 * a blocked port is a one-secret change rather than a rewrite.
 *
 * Nothing here throws. A reminder that fails to send is a reminder not sent;
 * it must never take the whole engine run down with it.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailResult {
  sent: number;
  failed: number;
  /** Which path was used, or why none was. Surfaced in the run's response. */
  provider: 'resend' | 'smtp' | 'none';
  error?: string;
}

const FROM_ADDRESS = Deno.env.get('EMAIL_FROM') ?? 'support@mywasilah.com';
const FROM_NAME = Deno.env.get('EMAIL_FROM_NAME') ?? 'Wasilah';

async function sendViaResend(messages: EmailMessage[], apiKey: string): Promise<EmailResult> {
  let sent = 0;
  let failed = 0;
  let firstError: string | undefined;

  for (const message of messages) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_ADDRESS}>`,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
      });

      if (response.ok) {
        sent += 1;
      } else {
        failed += 1;
        firstError ??= `resend ${response.status}: ${(await response.text()).slice(0, 200)}`;
      }
    } catch (error) {
      failed += 1;
      firstError ??= error instanceof Error ? error.message : String(error);
    }
  }

  return { sent, failed, provider: 'resend', error: firstError };
}

async function sendViaSmtp(messages: EmailMessage[], password: string): Promise<EmailResult> {
  const host = Deno.env.get('SMTP_HOST') ?? 'smtp.titan.email';
  const port = Number(Deno.env.get('SMTP_PORT') ?? '465');
  const username = Deno.env.get('SMTP_USER') ?? FROM_ADDRESS;

  let sent = 0;
  let failed = 0;
  let firstError: string | undefined;

  try {
    // Imported lazily so a Resend-configured deployment never pays for
    // pulling an SMTP client it will not use.
    const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts');

    const client = new SMTPClient({
      connection: {
        hostname: host,
        port,
        tls: port === 465,
        auth: { username, password },
      },
    });

    for (const message of messages) {
      try {
        await client.send({
          from: `${FROM_NAME} <${FROM_ADDRESS}>`,
          to: message.to,
          subject: message.subject,
          content: message.text,
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        firstError ??= error instanceof Error ? error.message : String(error);
      }
    }

    await client.close();
  } catch (error) {
    // A failure out here is the connection itself — which is what a platform
    // blocking outbound SMTP looks like. Reported rather than swallowed, so
    // the run's response says to switch to Resend.
    return {
      sent,
      failed: messages.length - sent,
      provider: 'smtp',
      error: `smtp connect failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  return { sent, failed, provider: 'smtp', error: firstError };
}

export async function sendEmails(messages: EmailMessage[]): Promise<EmailResult> {
  if (messages.length === 0) return { sent: 0, failed: 0, provider: 'none' };

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (resendKey) return sendViaResend(messages, resendKey);

  const smtpPassword = Deno.env.get('SMTP_PASS');
  if (smtpPassword) return sendViaSmtp(messages, smtpPassword);

  // Neither configured: not an error, just a deployment that has not been
  // given a way to send yet. Saying so beats failing silently.
  return {
    sent: 0,
    failed: 0,
    provider: 'none',
    error: 'No email provider configured. Set RESEND_API_KEY or SMTP_PASS.',
  };
}
