import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * PDF generation and storage service.
 * Uses Puppeteer to render HTML templates and stores PDFs in S3 with presigned URLs.
 */
export class PdfService {
  /**
   * Render an invoice HTML template to PDF buffer.
   *
   * @param invoice - Invoice data including line items, totals, tenant info
   * @returns PDF buffer
   */
  static async generate(invoice: any): Promise<Buffer> {
    // TODO: Implement Puppeteer rendering with proper invoice template
    const html = `<html><body><h1>Invoice ${invoice.invoiceNumber}</h1></body></html>`;
    // In production: use puppeteer to launch headless Chromium and generate PDF
    return Buffer.from(html);
  }

  /**
   * Upload a PDF buffer to S3 under the invoice's key.
   *
   * @param invoiceId - UUID of the invoice
   * @param buffer - PDF file buffer
   * @returns S3 object key
   */
  static async upload(invoiceId: string, buffer: Buffer): Promise<string> {
    const key = `invoices/${invoiceId}.pdf`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    }));
    return key;
  }

  /**
   * Generate a presigned GET URL for an S3 object.
   *
   * @param key - S3 object key
   * @returns Presigned URL valid for 1 hour
   */
  static async getPresignedUrl(key: string): Promise<string> {
    // TODO: Use GetObjectCommand and getSignedUrl with expires: 3600
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  }
}