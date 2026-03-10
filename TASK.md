# TASK.md — Invoice-to-Cash SaaS Build Tasks

**Last Updated:** 2026-03-11
**Format:** Check off tasks with `[x]` as they are completed.
**Reference:** PRD v1.0.0 · planning.md v1.0.0 · CLAUDE.md v1.0.0

---

## Milestone 0 — Project Foundation
> Monorepo scaffold, tooling, local dev environment, CI pipeline

- [x] Initialize Turborepo monorepo with pnpm workspaces
- [x] Create `apps/web` — Next.js 14 App Router + TypeScript
- [x] Create `packages/db` — Drizzle ORM workspace package
- [x] Create `packages/ui` — Shared component library workspace package
- [x] Create `packages/utils` — Shared types, schemas, helpers workspace package
- [x] Configure `turbo.json` pipeline — `build`, `lint`, `type-check`, `test` tasks
- [x] Configure root `tsconfig.json` with path aliases for all packages
- [x] Configure ESLint at root — extends to all packages
- [x] Configure Prettier at root — enforce in CI
- [x] Set up Husky + lint-staged — run lint + type-check on pre-commit
- [x] Create `docker-compose.yml` — PostgreSQL 15 + Redis 7 services
- [x] Create `.env.example` with all required variable keys (no values)
- [x] Create `.gitignore` — ignore `.env*`, `node_modules`, `.next`, `dist`
- [x] Set up GitHub Actions CI workflow — type-check → lint → test → build
- [ ] Connect repo to Vercel — enable preview deployments on PRs (manual step)
- [x] Write root `README.md` with quickstart instructions

---

## Milestone 1 — Database Schema & Migrations
> All tables defined, migrations generated and applied, seed script ready

- [x] Install and configure Drizzle ORM + Drizzle Kit in `packages/db` (package.json, config)
- [x] Create Drizzle client singleton with connection pooling config
- [x] Define `pgEnum` values — `userRole`, `invoiceStatus`, `paymentProvider`, `paymentStatus`, `discountType`, `reminderSlot`, `webhookProvider`
- [x] Define `tenants` table schema
- [x] Define `users` table schema with RBAC role enum
- [x] Define `customers` table schema with `billing_address` JSONB
- [x] Define `invoices` table schema with all status + financial columns
- [x] Define `invoice_line_items` table schema with `sort_order`
- [x] Define `payments` table schema
- [x] Define `reminder_templates` table schema with `offset_days`
- [x] Define `webhook_events` table schema with `event_id` unique constraint
- [x] Define `suppression_list` table schema for SES bounces/complaints
- [ ] Generate initial migration with Drizzle Kit
- [ ] Apply migration to local Docker Postgres
- [x] Write `db:seed` script — creates one test tenant, owner user, and sample customers + invoices
- [x] Add `db:studio` script — Drizzle Studio on local
- [x] Export all table schemas and types from `packages/db/index.ts`

---

## Milestone 2 — Authentication
> Email/password auth, JWT sessions, email verification, password reset

- [ ] Install NextAuth.js v5 in `apps/web`
- [ ] Configure NextAuth with Credentials provider in `apps/web/lib/auth.ts`
- [ ] Set up JWT strategy — encode `userId`, `tenantId`, `role`, `exp` in token
- [ ] Create `POST /api/auth/register` route handler — create tenant + owner user atomically
  - [ ] Hash password with bcrypt (cost factor 12)
  - [ ] Generate email verification token and store on user record
  - [ ] Send verification email via SES on register
- [ ] Create `POST /api/auth/login` — validate credentials, return session cookie
- [ ] Create `POST /api/auth/logout` — clear session
- [ ] Create `GET /api/auth/verify-email?token=` — mark user as verified
- [ ] Create `POST /api/auth/forgot-password` — generate reset token, send SES email
- [ ] Create `POST /api/auth/reset-password` — validate token expiry, update hashed password
- [ ] Build `/app/(auth)/login/page.tsx` — login form (email + password)
- [ ] Build `/app/(auth)/register/page.tsx` — registration form
- [ ] Build `/app/(auth)/forgot-password/page.tsx` — forgot password form
- [ ] Build `/app/(auth)/reset-password/page.tsx` — reset password form (token from URL)
- [ ] Build `/app/(auth)/verify-email/page.tsx` — "check your email" confirmation screen
- [ ] Write auth unit tests — valid login, invalid credentials, expired token, unverified user

---

## Milestone 3 — Middleware, RBAC & Protected Routes
> Tenant resolution, role enforcement, route guards

- [ ] Write `apps/web/middleware.ts`
  - [ ] Verify JWT signature and expiry on every `(dashboard)` request
  - [ ] Extract `tenantId` and `role` from JWT, forward as request headers
  - [ ] Redirect unauthenticated requests to `/login`
  - [ ] Redirect unverified users to `/verify-email`
- [ ] Create `requireRole(role)` helper — returns `403` if session role is insufficient
- [ ] Create `getTenantId()` helper — reads `x-tenant-id` header, never from request body
- [ ] Create `getSession()` server helper — typed wrapper around `getServerSession`
- [ ] Protect all `(dashboard)` layout routes — verify session in layout server component
- [ ] Write RBAC tests — each role attempting every action, assert allow/deny correctly

---

## Milestone 4 — Tenant Onboarding & Settings
> Onboarding wizard, company settings, logo upload

- [ ] Create `POST /api/v1/tenants/onboarding` — save company name, currency, payment terms
- [ ] Create `PATCH /api/v1/tenants/settings` — update tenant settings (Admin+)
- [ ] Create `POST /api/v1/tenants/logo` — accept multipart upload, resize, store to S3
- [ ] Build onboarding wizard — 3-step: Company Info → Logo → Payment Terms
- [ ] Build `/app/(dashboard)/settings/page.tsx` — company info + logo form
- [ ] Build settings sections — invoice numbering format, default currency, payment terms
- [ ] Implement S3 logo upload — client-side to presigned URL or server-side via route handler
- [ ] Show tenant logo in dashboard header and on invoice PDFs
- [ ] Auto-redirect new tenants to onboarding wizard on first login
- [ ] Write tenant settings unit tests — update fields, logo validation (size, type)

---

## Milestone 5 — Team Management
> Invite users, assign roles, revoke access

- [ ] Create `GET /api/v1/team` — list team members for tenant (Admin+)
- [ ] Create `POST /api/v1/team/invite` — send invite email, create pending invite record (Admin+)
- [ ] Create `GET /api/v1/team/invite/accept?token=` — accept invite, create or link user
- [ ] Create `PATCH /api/v1/team/:userId/role` — change team member role (Owner only)
- [ ] Create `DELETE /api/v1/team/:userId` — revoke access, invalidate sessions (Owner/Admin)
- [ ] Build `/app/(dashboard)/settings/team/page.tsx` — team member list
- [ ] Build invite modal — email input + role selector
- [ ] Build role change dropdown inline on team list
- [ ] Show pending invites section with ability to resend or cancel
- [ ] Write team management tests — invite flow, role change, revocation

---

## Milestone 6 — Customer Management
> Full CRUD, list view, customer detail page

- [ ] Create Zod schemas for customer create/update in `packages/utils`
- [ ] Create `GET /api/v1/customers` — paginated list, search by name/email, filter archived (Member+)
- [ ] Create `POST /api/v1/customers` — create customer (Member+)
- [ ] Create `GET /api/v1/customers/:id` — customer detail with invoice summary (Member+)
- [ ] Create `PATCH /api/v1/customers/:id` — update customer (Member+)
- [ ] Create `DELETE /api/v1/customers/:id` — soft archive, not hard delete (Admin+)
- [ ] Build `/app/(dashboard)/customers/page.tsx` — list with search, filter, pagination
- [ ] Build `/app/(dashboard)/customers/new/page.tsx` — create form
- [ ] Build `/app/(dashboard)/customers/[id]/page.tsx` — detail view with invoice history
- [ ] Build `/app/(dashboard)/customers/[id]/edit/page.tsx` — edit form
- [ ] Show "duplicate email" warning (non-blocking) on create/edit
- [ ] Write customer service unit tests — CRUD, archive, search

---

## Milestone 7 — Invoice Creation & Management
> Invoice form, line items, status display, list view

- [ ] Create Zod schemas for invoice create/update/send in `packages/utils`
- [ ] Create `InvoiceService` in `apps/web/lib/services/invoice.service.ts`
  - [ ] `create()` — generates invoice number per tenant sequence, inserts draft
  - [ ] `update()` — validates draft-only edits, updates line items transactionally
  - [ ] `send()` — transitions DRAFT → SENT atomically, generates payment token
  - [ ] `cancel()` — validates cancellable status, transitions to CANCELLED
  - [ ] `markViewed()` — sets `viewed_at` and status to VIEWED if currently SENT
  - [ ] `recordPayment()` — updates `amount_paid`, transitions to PAID or PARTIALLY_PAID
  - [ ] `markOverdue()` — batch job target, sets OVERDUE on past-due SENT/VIEWED invoices
- [ ] Create `GET /api/v1/invoices` — paginated, filterable by status/customer/date range (Member+)
- [ ] Create `POST /api/v1/invoices` — create draft (Member+)
- [ ] Create `GET /api/v1/invoices/:id` — invoice detail (Member+)
- [ ] Create `PATCH /api/v1/invoices/:id` — update draft (Member+)
- [ ] Create `POST /api/v1/invoices/:id/send` — send invoice (Member+)
- [ ] Create `POST /api/v1/invoices/:id/cancel` — cancel invoice (Admin+)
- [ ] Build `/app/(dashboard)/invoices/page.tsx` — list with status tabs, search, filters
- [ ] Build `/app/(dashboard)/invoices/new/page.tsx` — invoice creation form
  - [ ] Customer selector dropdown (searchable)
  - [ ] Dynamic line items — add, remove, drag-to-reorder
  - [ ] Real-time subtotal, discount, tax, total calculation
  - [ ] Issue date + due date pickers
  - [ ] Notes textarea
  - [ ] "Save Draft" and "Send Now" actions
- [ ] Build `/app/(dashboard)/invoices/[id]/page.tsx` — invoice detail view
  - [ ] Status badge with current state
  - [ ] Line items table
  - [ ] Payment history section
  - [ ] "Send", "Cancel", "Download PDF" action buttons (role-gated)
- [ ] Build `/app/(dashboard)/invoices/[id]/edit/page.tsx` — edit draft
- [ ] Set up nightly Bull cron job to run `markOverdue()` on past-due invoices
- [ ] Write invoice service unit tests — all status transitions, number generation, partial payments

---

## Milestone 8 — PDF Generation
> Puppeteer-based PDF rendering, S3 upload, presigned URL delivery

- [ ] Install Puppeteer in `apps/web` — configure for Vercel serverless (use `puppeteer-core` + `@sparticuz/chromium`)
- [ ] Create `PdfService` in `apps/web/lib/services/pdf.service.ts`
  - [ ] `generate(invoice)` — renders HTML template to PDF, returns buffer
  - [ ] `upload(invoiceId, buffer)` — uploads to S3 at key `{tenantId}/invoices/{invoiceId}.pdf`
  - [ ] `getPresignedUrl(invoiceId)` — returns 1-hour presigned GET URL
- [ ] Build React Email-style HTML invoice template (not React Email — raw HTML for Puppeteer)
  - [ ] Tenant logo, name, address
  - [ ] Customer billing address
  - [ ] Invoice number, issue date, due date
  - [ ] Line items table
  - [ ] Subtotal, discount, tax, total breakdown
  - [ ] Notes section
  - [ ] "Pay Now" link at the bottom
- [ ] Create `GET /api/v1/invoices/:id/pdf` — returns presigned URL (Member+)
- [ ] Trigger PDF generation on invoice send (async — do not block send response)
- [ ] Add "Download PDF" button on invoice detail page — fetches presigned URL
- [ ] Add PDF preview modal — renders presigned URL in `<iframe>` before sending
- [ ] Write PDF service tests — template renders, S3 upload mocked, URL generation

---

## Milestone 9 — Email Delivery
> AWS SES setup, invoice email, React Email templates, suppression list

- [ ] Configure AWS SES client in `apps/web/lib/aws/ses.client.ts`
- [ ] Verify sending domain in SES — configure DKIM, SPF, DMARC DNS records
- [ ] Create `EmailService` in `apps/web/lib/services/email.service.ts`
  - [ ] `send(to, subject, html)` — checks suppression list, calls SES, logs result
  - [ ] `isSuppressed(email)` — queries `suppression_list` table
  - [ ] `suppress(email, reason)` — adds to suppression list
- [ ] Build React Email templates (components in `apps/web/lib/emails/`)
  - [ ] `InvoiceEmail` — invoice summary, line items, Pay Now CTA, tenant branding
  - [ ] `ReminderEmail` — reminder message, outstanding amount, Pay Now CTA
  - [ ] `InviteEmail` — team invite with accept link
  - [ ] `VerificationEmail` — email verification link
  - [ ] `PasswordResetEmail` — reset password link
- [ ] Integrate `EmailService.send()` into `InvoiceService.send()` — send invoice email on status transition
- [ ] Create `POST /api/webhooks/ses` — handle SNS notifications for Bounce and Complaint events
  - [ ] Verify SNS signature
  - [ ] On Bounce → call `EmailService.suppress(email, 'bounce')`
  - [ ] On Complaint → call `EmailService.suppress(email, 'complaint')`
  - [ ] Store raw event in `webhook_events`
- [ ] Write email service tests — suppression check, SES mock, bounce handler

---

## Milestone 10 — Payment Processing
> Payment page, Stripe Checkout, PayPal Orders, webhook handlers

- [ ] Create `PaymentProvider` interface in `packages/utils/src/types/`
- [ ] Create `StripeProvider` in `apps/web/lib/services/payment-providers/stripe.provider.ts`
  - [ ] `createCheckoutSession()` — Stripe Checkout, idempotency key = `invoiceId`
  - [ ] `constructWebhookEvent()` — Stripe signature verification
  - [ ] `refund()` — Stripe refund via API
- [ ] Create `PayPalProvider` in `apps/web/lib/services/payment-providers/paypal.provider.ts`
  - [ ] `createCheckoutSession()` — PayPal Orders API v2 Create Order
  - [ ] `constructWebhookEvent()` — PayPal webhook signature verification
  - [ ] `refund()` — PayPal refund via API
- [ ] Create `PaymentService` in `apps/web/lib/services/payment.service.ts`
  - [ ] `recordPayment()` — insert payment row, update `amount_paid`, trigger status transition
- [ ] Create `GET /api/v1/pay/[token]` — resolve invoice by payment token, return public invoice data
- [ ] Create `POST /api/v1/pay/[token]/checkout` — create Stripe or PayPal checkout session, return redirect URL
- [ ] Create `POST /api/webhooks/stripe` — Stripe webhook handler
  - [ ] Verify signature first
  - [ ] Check `webhook_events` for idempotency
  - [ ] Handle `checkout.session.completed` → `PaymentService.recordPayment()`
  - [ ] Handle `charge.refunded` → update payment status
- [ ] Create `POST /api/webhooks/paypal` — PayPal webhook handler
  - [ ] Verify signature first
  - [ ] Check `webhook_events` for idempotency
  - [ ] Handle `PAYMENT.CAPTURE.COMPLETED` → `PaymentService.recordPayment()`
  - [ ] Handle `PAYMENT.CAPTURE.REFUNDED` → update payment status
- [ ] Build `/app/pay/[token]/page.tsx` — public payment page
  - [ ] Show invoice summary (company, amount, due date)
  - [ ] Payment method selector — Card (Stripe) / PayPal radio
  - [ ] "Pay Now" button → calls `/api/v1/pay/[token]/checkout` → redirect to Stripe/PayPal
  - [ ] Mark invoice as VIEWED on page load
- [ ] Build `/app/pay/[token]/success/page.tsx` — confirmation screen after payment
- [ ] Write payment service tests — idempotency, status transitions, partial payments
- [ ] Write webhook handler tests — valid event, duplicate event, invalid signature

---

## Milestone 11 — Automated Reminders
> Bull job scheduling, reminder template editor, cancellation on payment

- [ ] Configure Bull queue in `apps/web/lib/queue/reminder.queue.ts` — connect to Redis
- [ ] Set up Bull Board at `/admin/queues` — Owner role only (RBAC-gated)
- [ ] Create `ReminderService` in `apps/web/lib/services/reminder.service.ts`
  - [ ] `scheduleForInvoice(invoice)` — reads tenant templates, enqueues one job per active slot
  - [ ] `cancelForInvoice(invoiceId)` — removes all pending jobs for that invoice
  - [ ] `processJob(job)` — fetches invoice + customer, renders email template, calls `EmailService.send()`
- [ ] Seed default reminder templates for every new tenant on registration
  - [ ] Slot: `early` — offset: -3 days — "Invoice #{number} due in 3 days"
  - [ ] Slot: `due_today` — offset: 0 days — "Invoice #{number} is due today"
  - [ ] Slot: `late_1` — offset: +3 days — "Invoice #{number} is overdue"
  - [ ] Slot: `late_2` — offset: +7 days — "Action Required: Invoice #{number}"
  - [ ] Slot: `final` — offset: +14 days — "Final Notice: Invoice #{number}"
- [ ] Create `GET /api/v1/reminders/templates` — list tenant reminder templates (Admin+)
- [ ] Create `PATCH /api/v1/reminders/templates/:slot` — update template subject/body/enabled (Admin+)
- [ ] Build `/app/(dashboard)/settings/reminders/page.tsx` — reminder template editor
  - [ ] Enable/disable toggle per slot
  - [ ] Subject line input
  - [ ] Body textarea with merge tag reference panel (`{{customer_name}}`, `{{invoice_number}}`, etc.)
  - [ ] Preview button — renders with sample data
- [ ] Call `ReminderService.scheduleForInvoice()` from `InvoiceService.send()`
- [ ] Call `ReminderService.cancelForInvoice()` from `InvoiceService.recordPayment()` and `InvoiceService.cancel()`
- [ ] Write reminder service tests — job scheduling, job cancellation, merge tag rendering, suppression interaction

---

## Milestone 12 — Dashboard & Reporting
> Overview metrics, invoice list views, aging report, CSV export

- [ ] Create `GET /api/v1/dashboard/summary` — return totals: outstanding, overdue, collected this month, sent this month (Member+)
- [ ] Create `GET /api/v1/reports/aging` — aging report with 1–30, 31–60, 60+ day buckets (Member+)
- [ ] Create `GET /api/v1/reports/aging/export` — return CSV stream (Member+)
- [ ] Build `/app/(dashboard)/page.tsx` — main dashboard
  - [ ] 4 summary metric cards (outstanding, overdue, collected this month, sent this month)
  - [ ] Recent invoices table (last 10, with status badges)
  - [ ] Quick action button — "Create Invoice"
- [ ] Build overdue invoice list view — pre-filtered with aging bucket display
- [ ] Build `/app/(dashboard)/reports/aging/page.tsx` — aging report table
  - [ ] Columns: Customer · Invoice # · Issue Date · Due Date · Days Overdue · Amount Due
  - [ ] Sort by days overdue descending by default
  - [ ] "Export CSV" button
- [ ] Write dashboard/report query tests — correct totals, correct aging buckets, correct CSV output

---

## Milestone 13 — Observability & Error Handling
> Sentry integration, structured logging, Bull Board, error boundaries

- [ ] Install and configure Sentry in `apps/web` — both client and server
- [ ] Add `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` to env and Vercel config
- [ ] Wrap root layout with Sentry error boundary
- [ ] Add structured JSON logging to all API route handlers (log method, path, tenantId, duration, status)
- [ ] Add Sentry capture to all `catch` blocks in service layer
- [ ] Configure Bull job failure logging — log job name, invoice ID, error to Sentry
- [ ] Secure Bull Board at `/admin/queues` — verify Owner role before rendering
- [ ] Add Vercel Analytics script to root layout
- [ ] Build global error page `/app/error.tsx` — user-friendly fallback
- [ ] Build not-found page `/app/not-found.tsx`

---

## Milestone 14 — Testing Suite
> Unit tests, integration tests, E2E happy-path flows

- [ ] Configure Vitest in root workspace
- [ ] Configure React Testing Library + jsdom
- [ ] Configure MSW for API mocking in component tests
- [ ] Configure Playwright for E2E — set base URL to local dev server
- [ ] Write unit tests
  - [ ] `InvoiceService` — all status transitions, number generation, partial payment logic
  - [ ] `PaymentService` — recording payment, idempotency
  - [ ] `ReminderService` — scheduling, cancellation, merge tag rendering
  - [ ] `EmailService` — suppression check, SES mock
  - [ ] `PdfService` — template render, S3 upload mock
  - [ ] All Zod schemas — valid + invalid payloads
  - [ ] All webhook handlers — valid event, duplicate event, bad signature
  - [ ] RBAC helpers — each role on each action
  - [ ] Tenant isolation — assert no cross-tenant query is possible
- [ ] Write E2E tests (Playwright)
  - [ ] Register → onboarding → create customer → create invoice → send invoice
  - [ ] Open payment link → select Stripe → complete payment → invoice shows PAID
  - [ ] Open payment link → select PayPal → complete payment → invoice shows PAID
  - [ ] Reminder email sent after overdue date (mock time)
  - [ ] Team invite → accept → login as new member → create invoice

---

## Milestone 15 — Security Hardening
> Audit, rate limiting, headers, pen-test checklist

- [ ] Add rate limiting middleware — 100 req/min per IP on auth routes, 1,000 req/min per tenant on API
- [ ] Set security headers in `next.config.ts` — HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- [ ] Audit all DB queries — confirm every query has `tenantId` filter; add test assertions
- [ ] Audit all route handlers — confirm `tenantId` never sourced from user input
- [ ] Confirm all webhook handlers verify signatures before any DB access
- [ ] Confirm all S3 URLs are presigned — search codebase for hardcoded S3 `amazonaws.com` URLs
- [ ] Confirm no `console.log` outputs contain secrets, tokens, or PII
- [ ] Run `pnpm audit` — resolve all high/critical severity findings
- [ ] Confirm bcrypt cost factor is 12 in production config
- [ ] Confirm `.env*` files are in `.gitignore` and not in repo history

---

## Milestone 16 — Production Launch
> DNS, SES verification, environment config, deployment, smoke tests

- [ ] Provision production PostgreSQL (Supabase or Neon) — enable connection pooling
- [ ] Provision production Redis (Upstash) — enable persistence
- [ ] Provision AWS S3 bucket — private, correct region, CORS policy for presigned uploads
- [ ] Verify sending domain in AWS SES production — DKIM, SPF, DMARC validated
- [ ] Request SES production access (exit sandbox) — submit AWS support request
- [ ] Set all production environment variables in Vercel dashboard
- [ ] Set all CI environment variables as GitHub Actions secrets
- [ ] Run `pnpm --filter @invoice/db db:migrate` against production DB
- [ ] Configure custom domain in Vercel — point DNS records
- [ ] Register Stripe production webhook endpoint — set `STRIPE_WEBHOOK_SECRET`
- [ ] Register PayPal production webhook endpoint — set `PAYPAL_WEBHOOK_ID`
- [ ] Deploy to production via merge to `main`
- [ ] Run smoke tests against production
  - [ ] Register a new account end-to-end
  - [ ] Create and send an invoice
  - [ ] Complete a Stripe test payment via production checkout
  - [ ] Confirm reminder email is received
  - [ ] Confirm PDF download works
- [ ] Monitor Sentry for errors in first 24 hours post-launch
- [ ] Monitor SES bounce rate — keep below 2% threshold

---

## Backlog — Post v1.0

> Do not implement these until v1.0 is shipped and stable.

- [ ] **v1.2** — Recurring/subscription invoices
- [ ] **v1.2** — Client self-serve portal (pay without email link)
- [ ] **v1.2** — Outbound webhooks for tenant-registered endpoints
- [ ] **v1.3** — Multi-currency support beyond USD/EUR
- [ ] **v1.3** — Bulk invoice send
- [ ] **v1.3** — Custom invoice number format per tenant
- [ ] **v1.5** — QuickBooks integration
- [ ] **v1.5** — Xero integration
- [ ] **v1.5** — Stripe Connect for platform fees
- [ ] **v2.0** — Advanced analytics and cash flow forecasting
- [ ] **v2.0** — White-label / reseller program
- [ ] **v2.0** — AI-powered payment likelihood scoring

---

*Tasks are ordered by dependency. Complete each milestone before beginning the next.*
*Mark tasks `[x]` as completed and update this file at the end of every session.*