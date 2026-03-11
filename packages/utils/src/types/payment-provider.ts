export interface PaymentProvider {
  createCheckoutSession(invoice: any, returnUrl: string): Promise<{ url: string; sessionId: string; provider: 'stripe' | 'paypal' }>;
  constructWebhookEvent(rawBody: Buffer, signature: string): Promise<any>;
  refund(providerPaymentId: string, amount: number): Promise<void>;
}