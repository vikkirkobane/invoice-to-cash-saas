# CLAUDE.md — Invoice-to-Cash SaaS

> This file is read by Claude Code at the start of every session.
> It is the authoritative guide for how to write, structure, and reason about code in this project.
> Follow every instruction here precisely. When in doubt, ask before acting.

---

## Project Identity

**Name:** Invoice-to-Cash SaaS
**Type:** Multi-tenant B2B SaaS — invoice creation, payment collection, automated reminders
**Stack:** Next.js 14 (App Router) · TypeScript · Drizzle ORM · PostgreSQL · Redis/Bull · AWS SES · Stripe · PayPal
**Monorepo:** Turborepo + pnpm workspaces
**Deployment:** Vercel (app) · Supabase or Neon (DB) · Upstash (Redis) · AWS S3 (files)

---

## Repository Layout

```
invoice-to-cash-saas/
├── apps/
│   └── web/                        # The only deployable app — Next.js 14
│       ├── app/
│       │   ├── (auth)/             # Login, register, forgot-password — public
│       │   ├── (dashboard)/        # All protected routes — requires valid session
│       │   ├── pay/[token]/        # Public payment page — no auth
│       │   └── api/
│       │       ├── v1/             # REST API route handlers
│       │       └── webhooks/       # Stripe, PayPal, SES inbound webhooks
│       ├── components/             # Page-level and feature components
│       ├── lib/                    # Auth config, provider clients (Stripe, SES, S3)
│       └── middleware.ts           # JWT verification + RBAC + tenant resolution
├── packages/
│   ├── db/                         # Drizzle schema, migrations, db client singleton
│   ├── ui/                         # Shared Shadcn-styled components
│   └── utils/                      # Shared Zod schemas, types, formatters
├── docker-compose.yml              # Local Postgres + Redis
└── turbo.json
```

**Workspace package names:** `@invoice/web` · `@invoice/db` · `@invoice/ui` · `@invoice/utils`

When adding a new dependency, always specify the exact workspace:
```bash
pnpm add <pkg> --filter @invoice/web
```

---

## Core Mandates

These are non-negotiable. Every piece of code written in this project must obey them.

### 1. Tenant Isolation Is Sacred

Every database query that touches a tenant-owned table **must** filter by `tenant_id`. No exceptions.

```typescript
// ✅ Correct — always scope to tenant
const invoices = await db.query.invoices.findMany({
  where: and(eq(invoices.tenantId, tenantId), eq(invoices.status, 'sent')),
});

// ❌ Wrong — never query without tenant scope
const invoices = await db.query.invoices.findMany();
```

`tenantId` must come from the **verified middleware header** (`x-tenant-id`) or the validated session object — never from `req.body`, query params, or user input.

### 2. Every API Route Must Validate Input with Zod

No raw `req.body` or `req.query` access. Always parse through a Zod schema first.

```typescript
const schema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive(),
});

const result = schema.safeParse(await req.json());
if (!result.success) {
  return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
}
```

Zod schemas for shared entities live in `packages/utils/src/schemas/`. Reuse them; don't duplicate.

### 3. All Errors Return a Consistent Shape

```typescript
// Always return this shape for errors
return NextResponse.json({
  error: {
    code: 'INVOICE_NOT_FOUND',       // SCREAMING_SNAKE_CASE string constant
    message: 'Human-readable message.',
    status: 404,
  }
}, { status: 404 });
```

Never expose raw stack traces, Drizzle internals, or database error messages to the client.

### 4. Webhook Handlers Must Be Idempotent

Before processing any inbound webhook event, check the `webhook_events` table for a matching `event_id`. If found, return `200` immediately. If not, insert the record first, then process.

```typescript
const existing = await db.query.webhookEvents.findFirst({
  where: eq(webhookEvents.eventId, event.id),
});
if (existing) return NextResponse.json({ received: true });

await db.insert(webhookEvents).values({ eventId: event.id, ... });
// → now process
```

### 5. Verify Webhook Signatures Before Anything Else

Stripe and PayPal webhook routes must verify the provider's signature as the **first** operation. Reject with `400` immediately if verification fails. Never log the raw payload before verification.

### 6. No Secrets in Code

All keys, tokens, and credentials go in `.env.local` (dev) or Vercel environment variables (prod). Reference via `process.env.VARIABLE_NAME`. Never hardcode, never `console.log` a secret.

---

## Authentication & RBAC

**Provider:** NextAuth.js v5 — Credentials provider + JWT strategy
**Session contains:** `userId`, `tenantId`, `role`, `exp`
**Cookie:** httpOnly · Secure · SameSite=Lax

### Role Permission Matrix

| Action | Owner | Admin | Member |
|---|---|---|---|
| Manage billing | ✅ | ❌ | ❌ |
| Manage team | ✅ | ✅ | ❌ |
| Delete invoices | ✅ | ✅ | ❌ |
| Create/edit invoices | ✅ | ✅ | ✅ |
| View all invoices | ✅ | ✅ | ✅ |
| Manage settings | ✅ | ✅ | ❌ |
| View Bull dashboard | ✅ | ❌ | ❌ |

### Enforcing Roles in Route Handlers

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', status: 401 } }, { status: 401 });
  if (!['owner', 'admin'].includes(session.user.role)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', status: 403 } }, { status: 403 });
  }
  // ...
}
```

---

## Database Conventions

**ORM:** Drizzle ORM — all schema in `packages/db/src/schema/`
**Migrations:** Drizzle Kit — `pnpm --filter @invoice/db db:generate` then `db:migrate`
**Client:** Single singleton in `packages/db/src/client.ts` — import from `@invoice/db`

### Schema Rules

- All primary keys are `uuid('id').primaryKey().defaultRandom()`
- All tables with tenant ownership include `tenantId uuid references tenants(id)`
- All timestamps are `timestamptz` — use `createdAt` and `updatedAt` naming
- Use `numeric` (not `float`) for all money columns — precision `(12, 2)`
- Enums are defined as Drizzle `pgEnum` in `packages/db/src/schema/enums.ts`

### Invoice Status Enum

```
DRAFT → SENT → VIEWED → PARTIALLY_PAID → PAID
                    ↘ OVERDUE ↗
DRAFT | SENT → CANCELLED
```

Status transitions must only move forward. Never set `DRAFT` from `PAID`. Validate transitions in the service layer before committing.

### Money Handling

Always work with amounts in **major currency units as strings** when passing through API boundaries (e.g., `"1250.00"`). Convert to number only inside Drizzle inserts. Never use JavaScript floating-point arithmetic on money — use `decimal.js` or equivalent.

---

## API Design

**Prefix:** `/api/v1/` for all authenticated endpoints
**Webhooks:** `/api/webhooks/` — no auth middleware, signature-verified instead
**Public:** `/api/v1/pay/[token]` — no auth, token-gated

### Route Handler Pattern

```typescript
// apps/web/app/api/v1/invoices/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@invoice/db';
import { invoiceSchema } from '@invoice/utils';

export async function POST(req: Request) {
  // 1. Auth
  const session = await getServerSession(authOptions);
  if (!session) return unauthorized();

  // 2. Validate input
  const body = await req.json();
  const parsed = invoiceSchema.create.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  // 3. Service call — tenant-scoped
  const invoice = await InvoiceService.create(session.user.tenantId, parsed.data);

  // 4. Return
  return NextResponse.json(invoice, { status: 201 });
}
```

Keep route handlers thin. Business logic goes in service classes under `apps/web/lib/services/`.

---

## Service Layer

Service files live at `apps/web/lib/services/`. Each service is a plain class or module — no DI framework.

| File | Responsibility |
|---|---|
| `invoice.service.ts` | Create, update, send, cancel invoices; status transitions |
| `customer.service.ts` | CRUD for customers |
| `payment.service.ts` | Record payments; update invoice totals |
| `pdf.service.ts` | Puppeteer PDF generation; S3 upload; presigned URL |
| `email.service.ts` | SES send; template rendering; suppression list check |
| `reminder.service.ts` | Bull job scheduling; job cancellation on invoice paid |
| `payment-providers/stripe.provider.ts` | StripeProvider implements PaymentProvider |
| `payment-providers/paypal.provider.ts` | PayPalProvider implements PaymentProvider |

### PaymentProvider Interface

```typescript
// packages/utils/src/types/payment-provider.ts
export interface CheckoutSession {
  url: string;
  sessionId: string;
  provider: 'stripe' | 'paypal';
}

export interface PaymentProvider {
  createCheckoutSession(invoice: Invoice, returnUrl: string): Promise<CheckoutSession>;
  constructWebhookEvent(rawBody: Buffer, signature: string): Promise<WebhookEvent>;
  refund(providerPaymentId: string, amountMinorUnits: number): Promise<void>;
}
```

Never call Stripe or PayPal SDKs directly outside of their provider class files.

---

## Email & Queue

**Queue:** Bull backed by Redis — queue name `reminders`
**Email SDK:** `@aws-sdk/client-ses` — never use nodemailer
**Templates:** React Email components in `apps/web/lib/emails/`

### Scheduling Reminders

On every `invoice.send()` call, `ReminderService.scheduleForInvoice(invoice)` must be called. It enqueues one Bull job per active reminder template with a computed `delay`.

On every `invoice.markPaid()` or `invoice.cancel()` call, `ReminderService.cancelForInvoice(invoiceId)` must be called. It removes all pending jobs matching that invoice from the queue.

### Suppression List

Before every SES send, call `EmailService.isSuppressed(email)`. If `true`, skip the send silently and log it — never throw.

---

## File Storage (S3)

- Bucket is **private** — no public access policy
- All file access uses presigned URLs generated server-side with 1-hour expiry
- PDF key pattern: `{tenantId}/invoices/{invoiceId}.pdf`
- Logo key pattern: `{tenantId}/logos/{filename}`
- Never store a public S3 URL in the database — store the key and generate URLs on demand

---

## Frontend Conventions

### Component Structure

```
apps/web/components/
├── ui/           # Re-exported from @invoice/ui (buttons, cards, inputs)
├── forms/        # React Hook Form + Zod form components
├── layouts/      # Page wrappers, sidebar, header
└── features/     # Feature-specific components (InvoiceTable, PaymentModal, etc.)
```

### Forms

Always use React Hook Form + Zod resolver. Validation schemas come from `packages/utils`.

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInvoiceSchema, type CreateInvoiceInput } from '@invoice/utils';

const form = useForm<CreateInvoiceInput>({
  resolver: zodResolver(createInvoiceSchema),
  defaultValues: { currency: 'USD', lineItems: [{ description: '', quantity: 1, unitPrice: 0 }] },
});
```

Never manage form state with `useState` directly. Always use RHF.

### Data Fetching

- Server Components fetch data directly via service/db calls — no `fetch()` to own API
- Client Components use SWR or `fetch()` to `/api/v1/` endpoints when interactivity is needed
- Never expose the Drizzle client or AWS SDK to the browser bundle

### Styling

- Tailwind utility classes only — no inline `style=` unless for dynamic values that Tailwind cannot express
- Component variants use `cva` (class-variance-authority) from `@invoice/ui`
- Dark mode is not required for v1.0 — do not add `dark:` variants unless asked

---

## Testing

**Unit/Integration:** Vitest — test files co-located as `*.test.ts`
**Components:** React Testing Library + Vitest
**E2E:** Playwright — tests in `apps/web/e2e/`
**API Mocking:** MSW

### What Must Be Tested

- All service methods (invoice status transitions, payment recording, reminder scheduling/cancellation)
- All Zod schemas (valid and invalid inputs)
- Webhook handlers — especially idempotency and signature rejection
- RBAC — forbidden role attempting a protected action must receive `403`
- Tenant isolation — assert that queries never return cross-tenant data

### Running Tests

```bash
pnpm test               # All packages
pnpm test --filter @invoice/web   # Web app only
pnpm e2e                # Playwright E2E
```

---

## Dev Commands

```bash
# Start everything
pnpm dev                           # Next.js dev server on :3000
docker compose up -d               # Postgres :5432 + Redis :6379

# Database
pnpm --filter @invoice/db db:generate    # Generate migration from schema changes
pnpm --filter @invoice/db db:migrate     # Apply pending migrations
pnpm --filter @invoice/db db:seed        # Seed dev data
pnpm --filter @invoice/db db:studio      # Drizzle Studio UI

# CI checks (run before every PR)
pnpm type-check
pnpm lint
pnpm test
pnpm build

# Webhook testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe
ngrok http 3000   # for PayPal — register URL in PayPal Developer Dashboard
```

---

## Environment Variables

All required variables. Session will not work without them all set in `.env.local`.

```bash
# Database
DATABASE_URL=
REDIS_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
NEXT_PUBLIC_PAYPAL_ENV=sandbox

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_SES_FROM_ADDRESS=
AWS_S3_BUCKET_NAME=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Invoice-to-Cash

# Observability
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## What Is In Scope for v1.0

Build only what is on this list. Do not add features not listed here.

- [x] Auth — email/password, email verification, password reset, JWT sessions
- [x] RBAC — Owner, Admin, Member roles enforced in middleware + route handlers
- [x] Tenant onboarding wizard — company info, logo, currency, payment terms
- [x] Team management — invite, assign role, revoke access
- [x] Customer CRUD — create, edit, archive, list with search
- [x] Invoice CRUD — draft, edit, line items, tax, discount, due date
- [x] PDF generation — Puppeteer render → S3 upload → presigned URL
- [x] Send invoice — SES email with Pay Now link, status → SENT
- [x] Payment page — `/pay/[token]` — Stripe or PayPal selection
- [x] Stripe Checkout — session creation, webhook handler, payment recording
- [x] PayPal Orders — order creation, capture, webhook handler, payment recording
- [x] Automated reminders — Bull jobs scheduled on send, cancelled on paid
- [x] Reminder template editor — per-tenant, 5 slots, merge tags
- [x] Dashboard — outstanding, overdue, collected this month
- [x] Aging report — tabular, CSV export
- [x] SES bounce/complaint handling — suppression list

## What Is Out of Scope for v1.0

Do not implement these. Redirect any request for them to the roadmap.

- ❌ Recurring/subscription invoices (v1.2)
- ❌ Client self-serve portal (v1.2)
- ❌ Outbound webhooks for tenants (v1.2)
- ❌ Multi-currency beyond USD/EUR (v1.3)
- ❌ QuickBooks / Xero integration (v1.5)
- ❌ Stripe Connect platform fees (v1.5)
- ❌ Advanced analytics / forecasting (v2.0)
- ❌ White-label / reseller (v2.0)
- ❌ Native mobile app (unscheduled)

---

## Security Checklist

Before marking any feature complete, verify:

- [ ] All DB queries are scoped to `tenantId` from the verified session
- [ ] `tenantId` is never read from user-controlled input (body, params, headers set by client)
- [ ] Webhook signature verified before payload is parsed or processed
- [ ] Webhook event idempotency checked before processing
- [ ] No secret keys referenced anywhere except `process.env.*`
- [ ] All API inputs pass through Zod before use
- [ ] S3 URLs are presigned with expiry — no permanently public URLs stored
- [ ] Errors returned to client contain no stack traces or internal details
- [ ] Role checked before any state-mutating operation

---

## Performance Targets

| Metric | Target |
|---|---|
| API response time p95 | < 300ms |
| Dashboard LCP | < 2.5s |
| PDF generation | < 5s |
| Invoice email → inbox | < 30s |

If a new feature introduces a code path that would violate these, flag it before shipping.

---

## Preferred Patterns at a Glance

| Concern | Use This |
|---|---|
| Forms | React Hook Form + Zod resolver |
| Validation | Zod (shared schema from `@invoice/utils`) |
| DB queries | Drizzle ORM — never raw SQL except migrations |
| Money math | `decimal.js` — never `Number` float arithmetic |
| Email templates | React Email components |
| Job scheduling | Bull — never `setTimeout` or cron strings in app code |
| File URLs | S3 presigned URLs — never stored public URLs |
| Error responses | `{ error: { code, message, status } }` always |
| Payments | Through `PaymentProvider` interface — never direct SDK calls in routes |
| Icons | Lucide React only |
| Styling | Tailwind utilities + `cva` for variants |

---

*Last updated: 2026-03-11 · Derived from PRD v1.0.0 and planning.md v1.0.0*
*Update this file whenever a core architectural decision changes.*