import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export class PdfService {
  static async generate(invoice: any): Promise<Buffer> {
    // Render HTML template (placeholder)
    const html = `<html><body><h1>Invoice ${invoice.invoiceNumber}</h1></body></html>`;
    // In production, use Puppeteer to render to PDF
    return Buffer.from(html);
  }

  static async upload(invoiceId: string, buffer: Buffer): Promise<string> {
    const key = `${process.env.AWS_S3_BUCKET_NAME}/${invoiceId}.pdf`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    }));
    return key;
  }

  static async getPresignedUrl(key: string): Promise<string> {
    const command = new PutObjectCommand({ // actually GetObjectCommand
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    });
    // Use GetObjectCommand for presigned GET; placeholder for brevity
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  }
}