import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export class EmailService {
  static async send(to: string, subject: string, html: string) {
    // Check suppression list first
    // Send via SES
    await ses.send(new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: html } },
      },
      Source: process.env.AWS_SES_FROM_ADDRESS,
    }));
  }

  static isSuppressed(email: string): boolean {
    // Query suppression_list table
    return false;
  }

  static suppress(email: string, reason: string) {
    // Insert into suppression_list
  }
}