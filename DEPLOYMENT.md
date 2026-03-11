# Production Deployment Checklist

## Pre-deployment

- [ ] Provision managed PostgreSQL (Neon recommended). See **NEON_SETUP.md** for step-by-step integration.
- [ ] Provision managed Redis (Upstash) with persistence
- [ ] Create private AWS S3 bucket with correct CORS policy
- [ ] Verify domain in AWS SES, set up DKIM, SPF, DMARC
- [ ] Request SES production access (exit sandbox)
- [ ] Register webhook endpoints in Stripe and PayPal dashboards
- [ ] Set all environment variables in Vercel and GitHub Actions secrets

## Deployment

1. Push to `main` — Vercel auto-deploys to production
2. Run database migrations: `pnpm --filter @invoice/db db:migrate`
3. Verify health endpoints: `/api/v1/dashboard/summary` returns 200
4. Smoke tests:
   - Register a new tenant
   - Create and send an invoice
   - Complete a test payment
   - Verify reminder email flow (use test time override)
5. Monitor Sentry for errors
6. Monitor SES bounce rate (<2%)

## Rollback

- Vercel: promote previous deployment from dashboard
- Database: ensure migrations are reversible (keep old migrations)

## Post-launch

- [ ] Set up Vercel Analytics and review Web Vitals
- [ ] Configure Sentry alerts for error spikes
- [ ] Enable GitHub Actions branch protection (require CI pass)
- [ ] Schedule daily DB backups (Supabase handles automatically)