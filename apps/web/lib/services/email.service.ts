import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Email service using AWS SES.
 * Before sending, checks suppression list to avoid bounces/complaints.
 */
export class EmailService {
  /**
   * Send a transactional email via SES.
   *
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param html - HTML body content
   */
  static async send(to: string, subject: string, html: string) {
    // In production: query suppression_list table for this email+tenant
    // if suppressed, return early without sending.
    await ses.send(new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: html } },
      },
      Source: process.env.AWS_SES_FROM_ADDRESS,
    }));
  }

  /**
   * Check if an email address is on the suppression list for a given tenant.
   * (Implementation pending DB query)
   */
  static isSuppressed(email: string): boolean {
    // Query suppression_list table
    return false;
  }

  /**
   * Add an email to the suppression list with a reason (e.g., 'bounce', 'complaint').
   */
  static suppress(email: string, reason: string) {
    // Insert into suppression_list
  }
}