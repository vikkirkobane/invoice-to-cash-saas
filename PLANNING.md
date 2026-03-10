# Invoice-to-Cash SaaS — Planning Document

**Version:** 1.0.0
**Date:** 2026-03-11
**Status:** Active
**Author:** Engineering — Full Stack

---

## Table of Contents

1. [Vision](#1-vision)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Required Tools](#4-required-tools)

---

## 1. Vision

### 1.1 Product Vision

Invoice-to-Cash is a focused, multi-tenant SaaS platform built on a single belief: **getting paid should never be the hardest part of doing business.** The platform eliminates the gap between delivering work and collecting money by unifying invoice creation, online payment acceptance, and automated follow-up into one seamless workflow.

The end state is a product where a business owner can go from zero to a paid invoice in under five minutes — with no manual follow-up, no chasing, and no friction for the client on the other end.

### 1.2 Mission Statement

> Empower small businesses and freelancers to eliminate cash flow gaps by automating every step between issuing an invoice and receiving payment.

### 1.3 Core Principles

These principles guide every architectural and product decision made during development:

**Tenant-first data isolation** — Every database query, API response, and file asset is scoped to the authenticated tenant. Cross-tenant data leakage is treated as a critical severity bug with zero tolerance.

**Automation over manual action** — The platform should do the work the user would otherwise forget. Reminders fire automatically. Statuses update automatically. PDFs generate automatically. The user's default interaction is to review, not to act.

**Payment-path simplicity** — The path from receiving an invoice email to completing payment must require the fewest possible clicks. No account creation. No friction. A client should be able to pay from any device in under 60 seconds.

**Extensibility by design** — The payment provider layer, email engine, and job queue are abstracted behind interfaces from day one. Swapping a provider or adding a new one must not require changes across the application.

**Observability as a first-class concern** — Errors, queue failures, webhook events, and email bounces are logged, tracked, and surfaced. Blind spots in production are unacceptable.

### 1.4 Target Outcomes by Phase

| Phase | Target Outcome |
|---|---|
| MVP (v1.0) | A tenant can create, send, and collect payment on an invoice end-to-end with automated reminders |
| Growth (v1.2) | Tenants retain clients via a self-serve client portal; recurring invoices reduce manual work |
| Scale (v1.5) | Accounting integrations (QuickBooks, Xero) make the platform sticky for finance-aware buyers |
| Platform (v2.0) | White-label, reseller model, and AI-powered payment forecasting open an enterprise segment |

---

## 2. Architecture

### 2.1 System Overview

The platform is structured as a **monorepo** managed by Turborepo, containing one deployable application (`apps/web`) and three shared packages (`packages/db`, `packages/ui`, `packages/utils`). This structure enforces clear boundaries between concerns while enabling shared types, components, and utilities across the workspace without duplication.

```
invoice-to-cash-saas/                  ← Turborepo root
├── apps/
│   └── web/                           ← Next.js 14 (App Router) — sole deployable app
│       ├── app/
│       │   ├── (auth)/                ← Public auth routes (login, register, reset)
│       │   ├── (dashboard)/           ← Protected routes behind auth middleware
│       │   │   ├── invoices/
│       │   │   ├── customers/
│       │   │   ├── settings/
│       │   │   └── reports/
│       │   ├── pay/[token]/           ← Public payment page (no auth required)
│       │   └── api/
│       │       ├── v1/                ← REST API route handlers
│       │       └── webhooks/          ← Stripe, PayPal, SES inbound webhooks
│       ├── components/                ← Page-level and feature components
│       ├── lib/                       ← Auth config, provider clients, helpers
│       └── middleware.ts              ← Tenant resolution + RBAC enforcement
├── packages/
│   ├── db/                            ← Drizzle schema, migrations, db client singleton
│   ├── ui/                            ← Shared design system components (Shadcn-styled)
│   └── utils/                         ← Shared types, Zod schemas, formatters
├── turbo.json                         ← Pipeline config (build, lint, test, type-check)
├── docker-compose.yml                 ← Local Postgres + Redis
└── .github/workflows/                 ← CI pipeline
```

### 2.2 Application Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│   Next.js App Router — RSC + Client Components + Layouts    │
│   React Hook Form · Zod · Tailwind · Shadcn/ui              │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      API / BFF LAYER                         │
│        Next.js Route Handlers  (/api/v1/*  /api/webhooks/*)  │
│        NextAuth Session Validation · RBAC Middleware         │
│        Zod input validation · Rate limiting                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     SERVICE LAYER                            │
│   InvoiceService · CustomerService · PaymentService         │
│   PdfService (Puppeteer) · EmailService (SES)               │
│   ReminderScheduler (Bull) · PaymentProvider interface      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      DATA LAYER                              │
│         Drizzle ORM · PostgreSQL 15 · PgBouncer             │
│         Redis (Bull queue only) · AWS S3 (file storage)     │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Infrastructure Architecture

```
                         ┌──────────────────────────────┐
              DNS/CDN →  │     Vercel Edge Network       │
                         │  Next.js (SSR + API Routes)   │
                         └──────────┬──────────────────┘
                                    │
           ┌────────────────────────┼───────────────────────┐
           │                        │                       │
  ┌────────▼────────┐    ┌──────────▼──────┐    ┌──────────▼──────┐
  │  PostgreSQL 15  │    │  Redis (Upstash) │    │   AWS S3        │
  │  (Supabase or   │    │  Bull job queue  │    │  PDFs + Logos   │
  │   Neon / RDS)   │    │                  │    │  (private bucket)│
  └─────────────────┘    └──────────┬───────┘    └─────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   Bull Worker        │
                         │  (Reminder Emailer)  │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────▼──────────────────┐
                    │           AWS SES                  │
                    │  Transactional + Reminder Email    │
                    └───────────────────────────────────┘

External Inbound:
  Stripe   ──→  POST /api/webhooks/stripe
  PayPal   ──→  POST /api/webhooks/paypal
  SES/SNS  ──→  POST /api/webhooks/ses
```

### 2.4 Authentication & Authorization Architecture

NextAuth.js v5 manages sessions using the Credentials provider (email + password). On successful login, a signed JWT is issued containing: `userId`, `tenantId`, `role`, and `exp`. The JWT is stored in an httpOnly, Secure, SameSite=Lax cookie.

`middleware.ts` intercepts every request to `(dashboard)` routes and:
1. Verifies the JWT signature and expiry
2. Resolves the tenant from the JWT's `tenantId`
3. Checks the user's `role` against the required permission for the route
4. Forwards the verified `tenantId` to downstream route handlers via request headers

All database queries in route handlers receive `tenantId` from the verified middleware header — never from user-supplied input — ensuring tenant isolation cannot be bypassed.

### 2.5 Payment Processing Architecture

A `PaymentProvider` interface abstracts both gateways behind a single contract. The active provider for a given checkout is chosen by the payer on the payment page.

```typescript
interface PaymentProvider {
  createCheckoutSession(invoice: Invoice, returnUrl: string): Promise<CheckoutSession>;
  constructWebhookEvent(rawBody: Buffer, signature: string): WebhookEvent;
  refund(providerPaymentId: string, amount: number): Promise<void>;
}

// Implementations:
class StripeProvider implements PaymentProvider { ... }
class PayPalProvider implements PaymentProvider { ... }
```

Webhook handlers store each inbound event in `webhook_events` before processing. Processing is idempotent: if the `event_id` already exists in the table, the handler returns 200 immediately without re-processing.

### 2.6 Email & Queue Architecture

Reminder scheduling is handled by Bull (backed by Redis). On invoice send:

1. The `ReminderScheduler` service reads the tenant's active reminder templates
2. For each template, a Bull job is created with a `delay` calculated from `due_date + template.offset_days`
3. Each job calls the `EmailService`, which renders a React Email template and sends via AWS SES
4. On invoice paid or cancelled, all pending Bull jobs for that `invoice_id` are removed

Failed SES deliveries trigger SNS notifications to `POST /api/webhooks/ses`, which adds the recipient to a `suppression_list` table. All future emails to suppressed addresses are skipped before the SES call is even made.

### 2.7 Multi-Tenancy Model

The platform uses a **shared database, row-level tenant isolation** model. Every primary table includes a `tenant_id` column. Drizzle ORM query builders in `packages/db` expose a `forTenant(tenantId)` helper that appends `WHERE tenant_id = $1` to all queries, making it structurally difficult to write a query without scoping it correctly.

This model was chosen over schema-per-tenant for operational simplicity at the scale of v1.0. Migration to schema-per-tenant is feasible if enterprise isolation requirements demand it in a future version.

### 2.8 Data Flow — Invoice Lifecycle

```
User creates invoice (DRAFT)
       │
       ▼
User clicks "Send"
       │
       ├─→ PDF generated (Puppeteer) → uploaded to S3
       ├─→ Invoice status set to SENT, payment_token generated
       ├─→ Email sent via SES (invoice + Pay Now link)
       └─→ Reminder jobs scheduled in Bull queue
              │
              ▼
Client opens payment link (/pay/{token})
       │
       ├─→ Invoice status set to VIEWED, viewed_at recorded
       └─→ Client selects Stripe or PayPal → Checkout session created
              │
              ▼
Client completes payment (Stripe/PayPal hosted page)
       │
       ├─→ Webhook received → payment recorded → invoice marked PAID
       ├─→ All pending reminder jobs cancelled
       └─→ Confirmation email sent to client + tenant notification
```

---

## 3. Technology Stack

### 3.1 Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.x | Full-stack React framework; App Router for RSC + layouts |
| TypeScript | 5.x | End-to-end type safety across monorepo |
| Tailwind CSS | 3.x | Utility-first styling; consistent design tokens |
| Shadcn/ui | latest | Pre-built, accessible component primitives (Radix-based) |
| React Hook Form | 7.x | Performant form state management; minimal re-renders |
| Zod | 3.x | Runtime schema validation shared between client and server |
| React Email | 2.x | Type-safe, component-driven email template authoring |
| Lucide React | latest | Icon library — consistent with Shadcn ecosystem |

### 3.2 Backend / API

| Technology | Version | Purpose |
|---|---|---|
| Next.js Route Handlers | 14.x | REST API endpoints co-located with the app |
| NextAuth.js | v5 (beta) | Session management; Credentials provider + JWT |
| bcrypt | 5.x | Password hashing (cost factor 12) |
| Drizzle ORM | 0.30.x | Type-safe SQL query builder; schema-first migrations |
| Drizzle Kit | 0.20.x | Migration generation and schema introspection |
| Zod | 3.x | Input validation on all API route handlers |

### 3.3 Data & Infrastructure

| Technology | Version | Purpose |
|---|---|---|
| PostgreSQL | 15.x | Primary relational database |
| Redis | 7.x | Bull job queue backing store |
| Bull | 4.x | Job queue for scheduled reminder emails |
| Bull Board | 5.x | Visual queue dashboard (Owner-only at `/admin/queues`) |
| AWS SES | v2 SDK | Transactional and reminder email delivery |
| AWS S3 | v3 SDK | PDF invoice and tenant logo file storage |
| Puppeteer | 21.x | Headless Chromium for PDF generation from HTML |

### 3.4 Payment Providers

| Technology | Purpose |
|---|---|
| Stripe Node SDK | Stripe Checkout sessions; webhook signature verification |
| PayPal Orders SDK | PayPal Orders API v2; webhook verification |

### 3.5 Dev Tooling & Build

| Technology | Version | Purpose |
|---|---|---|
| Turborepo | 1.x | Monorepo task orchestration; caching; pipelines |
| pnpm | 8.x | Workspace-aware, fast package manager |
| ESLint | 8.x | Linting across all packages |
| Prettier | 3.x | Code formatting (enforced in CI) |
| Husky | 8.x | Pre-commit hooks (lint + type-check before commit) |
| lint-staged | 15.x | Run linters only on staged files |
| Docker + Compose | latest | Local Postgres + Redis for development |

### 3.6 Testing

| Technology | Purpose |
|---|---|
| Vitest | Unit and integration tests for services and utilities |
| React Testing Library | Component-level tests |
| Playwright | End-to-end tests covering critical user flows |
| MSW (Mock Service Worker) | API mocking in component/integration tests |

### 3.7 CI/CD & Observability

| Technology | Purpose |
|---|---|
| GitHub Actions | CI pipeline: type-check → lint → test → build on every PR |
| Vercel | Production and preview deployments; edge network |
| Sentry | Error tracking (frontend + server-side) |
| Vercel Analytics | Core Web Vitals + real-user performance monitoring |
| Axiom / Logtail | Structured JSON log aggregation for API and worker logs |

---

## 4. Required Tools

### 4.1 Developer Workstation

Every engineer working on this project must have the following installed locally:

| Tool | Version | Install |
|---|---|---|
| Node.js | 20.x LTS | `nvm install 20` |
| pnpm | 8.x | `npm install -g pnpm@8` |
| Docker Desktop | latest | [docker.com/products/docker-desktop](https://docker.com/products/docker-desktop) |
| Git | 2.40+ | System or Homebrew |

**Recommended editor:** VS Code with the following extensions:
- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
- Drizzle ORM (`drizzle-team.drizzle-orm`)
- Prisma (for SQL syntax highlighting in `.sql` files)
- GitLens (`eamodio.gitlens`)

### 4.2 Required Accounts & Services

All services below must be provisioned and credentials added to `.env.local` before the stack is functional. See `.env.example` for the full variable list.

#### Database

| Service | Purpose | Notes |
|---|---|---|
| **Supabase** (recommended) or **Neon** | Managed PostgreSQL 15 | Free tier available for dev; enable connection pooling |
| **Upstash Redis** | Managed Redis for Bull | Serverless-friendly; REST-compatible with Vercel |

#### Authentication

| Service | Purpose | Notes |
|---|---|---|
| **NextAuth.js** | Session management | No external account needed; configured in-app |

Auth secret generated locally:
```bash
openssl rand -base64 32
```

#### Payment Processing

| Service | Purpose | Required Keys |
|---|---|---|
| **Stripe** | Card payment processing | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **PayPal Developer** | PayPal payment processing | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` |

Both providers require a developer account. Stripe test mode and PayPal Sandbox are used in development and staging. Keys must never be shared between environments.

#### Email

| Service | Purpose | Required Config |
|---|---|---|
| **AWS SES** | Transactional + reminder email delivery | Verified sending domain, DKIM/SPF/DMARC configured |
| **AWS IAM** | SES access credentials | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` |

SES must be moved out of sandbox mode before production launch. Domain verification is required — not just email address verification.

#### File Storage

| Service | Purpose | Required Config |
|---|---|---|
| **AWS S3** | PDF invoice storage, tenant logos | `AWS_S3_BUCKET_NAME`, bucket policy restricts public access |

Bucket must be private. All access is via presigned URLs with 1-hour expiry generated server-side.

#### Deployment

| Service | Purpose | Notes |
|---|---|---|
| **Vercel** | Hosting + preview deployments | Connect GitHub repo; set env vars in Vercel dashboard |
| **GitHub** | Source control + CI | GitHub Actions uses repository secrets for CI env vars |

### 4.3 Environment Variables Reference

```bash
# ─── Database ───────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
REDIS_URL=rediss://default:password@host:6379

# ─── Auth ───────────────────────────────────────────
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# ─── Stripe ─────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── PayPal ─────────────────────────────────────────
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
NEXT_PUBLIC_PAYPAL_ENV=sandbox   # or 'production'

# ─── AWS ────────────────────────────────────────────
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_SES_FROM_ADDRESS=invoices@yourdomain.com
AWS_S3_BUCKET_NAME=invoice-to-cash-files

# ─── App ────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Invoice-to-Cash"

# ─── Observability ──────────────────────────────────
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

### 4.4 Local Development Bootstrap

Once all tools are installed and accounts are provisioned, a developer can get fully running with:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/invoice-to-cash-saas.git
cd invoice-to-cash-saas

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env.local
# → Fill in all values from section 4.3

# 4. Start local infrastructure (Postgres + Redis)
docker compose up -d

# 5. Run database migrations
pnpm --filter @invoice/db db:migrate

# 6. Seed development data (optional)
pnpm --filter @invoice/db db:seed

# 7. Start the development server
pnpm dev

# App:       http://localhost:3000
# Bull UI:   http://localhost:3000/admin/queues
```

### 4.5 CI/CD Pipeline Overview

GitHub Actions runs the following pipeline on every pull request and push to `main`:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  type-check  │ →  │    lint      │ →  │    test      │ →  │    build     │
│  tsc --noEmit│    │  ESLint +    │    │  Vitest +    │    │  turbo build │
│  all packages│    │  Prettier    │    │  Playwright  │    │  all apps    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                     │
                                                          ┌──────────▼──────────┐
                                                          │  Vercel Deploy       │
                                                          │  (Preview on PR /    │
                                                          │   Production on main)│
                                                          └─────────────────────┘
```

All four jobs must pass before a PR can be merged to `main`. Vercel preview deployments are created automatically for every open PR.

### 4.6 Stripe & PayPal Webhook Local Testing

To test webhook flows locally, use the respective CLI tools to forward events to your local dev server:

**Stripe:**
```bash
# Install Stripe CLI, then:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**PayPal:**
```bash
# PayPal does not have a native CLI forwarder.
# Use ngrok to expose localhost:
ngrok http 3000
# Then register the ngrok URL as the webhook endpoint in the PayPal Developer Dashboard.
```

---

*This document is maintained alongside the PRD. Updates to the tech stack, infrastructure choices, or tooling requirements must be reflected here before work begins on the affected component.*

---

**Document History**

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0.0 | 2026-03-11 | Engineering | Initial planning document |