# Security Hardening Checklist

- [x] All DB queries filter by `tenantId` from verified session headers
- [x] Webhook signatures verified before processing
- [x] Webhook idempotency via `webhook_events` table
- [x] No secrets in code — all via env vars
- [x] All API inputs validated with Zod
- [x] S3 URLs are presigned with 1-hour expiry
- [x] Errors return consistent shape without stack traces
- [x] Role checks before state-mutating operations
- [x] Rate limiting middleware in place (100/min auth IP, 1000/min API tenant)
- [x] Security headers set (CSP, X-Frame-Options, X-Content-Type-Options)
- [x] `.env*` in .gitignore
- [x] bcrypt cost factor 12

Additional notes:
- Before production, run `pnpm audit` and address high/critical issues
- Consider enabling PgBouncer for connection pooling
- Ensure Redis persistence (AOF) if self-hosted