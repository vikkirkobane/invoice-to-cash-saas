# Invoice-to-Cash SaaS

[![CI](https://github.com/vikkirkobane/invoice-to-cash-saas/actions/workflows/ci.yml/badge.svg)](https://github.com/vikkirkobane/invoice-to-cash-saas/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Get paid faster, automatically.** A multi-tenant B2B SaaS platform that unifies invoice creation, online payment collection, and automated reminders into one seamless workflow.

---

## ❌ The Problem Small Businesses Face

Small businesses and freelancers lose significant revenue due to:

- **Manual, error-prone invoicing** — spreadsheets and one-off PDFs create inconsistencies and missed line items.
- **Delayed payment follow-ups** — chasing payments manually is time-consuming and often forgotten.
- **Fragmented payment collection** — clients want to pay by card or PayPal, but many tools only support one gateway.
- **No cash flow visibility** — business owners can’t quickly see what’s outstanding, overdue, or collected.
- **Poor client experience** — emailed PDF attachments with bank details feel archaic and create friction.

There’s a clear gap for an affordable, easy-to-deploy platform that unifies invoice generation, payment acceptance, and automated follow-up in one product.

---

## ✨ Our Solution

**Invoice-to-Cash SaaS** eliminates the gap between delivering work and collecting money. With a few clicks, a business can:

1. Create a professional invoice with custom line items, tax, and discounts.
2. Send it via email with a **Pay Now** link.
3. Accept payments through **Stripe** or **PayPal**.
4. Automate reminder emails before due, on due, and after due dates.
5. Track outstanding, overdue, and collected amounts in real-time on a clean dashboard.

The platform is built on a modern, type-safe stack and follows security-first principles (tenant isolation, RBAC, webhook idempotency, signature verification).

---

## 🚀 Quickstart

Ready to run the project locally?

1. **Clone and install**
   ```bash
   git clone https://github.com/vikkirkobane/invoice-to-cash-saas.git
   cd invoice-to-cash-saas
   pnpm install
   ```

2. **Start infrastructure** (Postgres + Redis)
   ```bash
   docker compose up -d
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Fill in required variables (see .env.example and LOCAL_SETUP.md)
   ```

4. **Run migrations and seed**
   ```bash
   pnpm --filter @invoice/db db:migrate
   pnpm --filter @invoice/db db:seed
   ```

5. **Start dev server**
   ```bash
   pnpm dev
   ```

6. Open http://localhost:3000 and register a new account.

For a detailed step-by-step guide, including troubleshooting and optional tooling, see [LOCAL_SETUP.md](./LOCAL_SETUP.md).

---

---

## 🏗️ Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│   Next.js 14 App Router — React Server Components + Client  │
│   Tailwind CSS + Shadcn/ui  •  React Hook Form + Zod         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      API / BFF LAYER                         │
│        Next.js Route Handlers  (/api/v1/*  /api/webhooks/*) │
│        NextAuth (JWT) + RBAC Middleware                      │
│        Zod validation  •  Rate limiting                      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     SERVICE LAYER                            │
│   InvoiceService • CustomerService • PaymentService         │
│   PdfService (Puppeteer) • EmailService (AWS SES)           │
│   ReminderScheduler (Bull) • PaymentProvider abstraction    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      DATA LAYER                              │
│         Drizzle ORM • PostgreSQL 15 • PgBouncer             │
│         Redis ( Bull queue ) • AWS S3 (file storage)        │
└─────────────────────────────────────────────────────────────┘
```

**Infrastructure:** Vercel (hosting) • Supabase/Neon (Postgres) • Upstash (Redis) • AWS (SES, S3) • Stripe/PayPal (payments)

---

## 🚀 Features

### Core Functionality

- **Multi-tenancy** with strict row-level tenant isolation (`tenant_id` scoping)
- **Authentication** — email/password via NextAuth.js + JWT sessions
- **Role-Based Access Control** (Owner, Admin, Member) enforced in middleware
- **Customer Management** — CRUD, search, soft archive
- **Invoice Management** — draft/send/cancel, line items, discounts, tax, notes
- **PDF Generation** — Puppeteer → S3 (presigned URLs)
- **Email Delivery** — AWS SES with React Email templates
- **Payments** — Stripe Checkout + PayPal Orders API; webhooks handle completion
- **Automated Reminders** — Bull job queue; per-tenant customizable templates with merge tags
- **Dashboard** — outstanding, overdue, collected metrics; recent invoices
- **Aging Report** — overdue buckets + CSV export

### Security & Reliability

- All DB queries filtered by verified `tenantId`
- Webhook signature verification (Stripe/PayPal/SES)
- Idempotent webhook processing (`webhook_events` table)
- Rate limiting (100/min auth IP, 1000/min API tenant)
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- Secrets via environment variables only
- Consistent error responses without stack traces

### Developer Experience

- **Monorepo** managed by Turborepo with pnpm workspaces
- **Type-safe** end-to-end with TypeScript and shared Zod schemas
- **Shared packages**: `@invoice/db` (Drizzle), `@invoice/ui` (Shadcn-styled), `@invoice/utils`
- **CI/CD** — GitHub Actions: type-check → lint → test → build; Vercel auto-deploy
- **Testing** — Vitest (unit), React Testing Library (components), Playwright (E2E)
- **Observability** — Sentry error tracking; Vercel Analytics

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/ui |
| Forms | React Hook Form + Zod |
| Auth | NextAuth.js (Credentials provider + JWT) |
| ORM | Drizzle ORM + Drizzle Kit (PostgreSQL 15) |
| Queue | Bull + Redis |
| Payments | Stripe Node SDK, PayPal Checkout Server SDK |
| Email | AWS SES v2 + React Email |
| PDF | Puppeteer (headless Chromium) |
| File Storage | AWS S3 (presigned URLs) |
| DevOps | Vercel, GitHub Actions, Docker Compose (local) |
| Monitoring | Sentry, Vercel Analytics |

---

## 🧑‍💻 For Developers

### Prerequisites

- Node.js 20
- pnpm 8
- Docker + Docker Compose
- Accounts: Supabase/Neon, Upstash, AWS (SES/S3), Stripe, PayPal

### Local Setup

```bash
# 1. Clone and install
git clone https://github.com/vikkirkobane/invoice-to-cash-saas.git
cd invoice-to-cash-saas
pnpm install

# 2. Start infrastructure
docker compose up -d

# 3. Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL, REDIS_URL, NEXTAUTH_SECRET, etc.

# 4. Run migrations and seed
pnpm --filter @invoice/db db:migrate
pnpm --filter @invoice/db db:seed

# 5. Start dev server
pnpm dev
```

App: http://localhost:3000

### Project Structure

```
invoice-to-cash-saas/
├── apps/
│   └── web/                 # Next.js application
├── packages/
│   ├── db/                  # Drizzle schema, migrations
│   ├── ui/                  # Shared UI components
│   └── utils/               # Zod schemas, types, helpers
├── docker-compose.yml       # Local Postgres + Redis
├── turbo.json               # Turborepo pipeline
└── TASK.md                  # Full build checklist
```

### CI

Push to `main` triggers:
`type-check → lint → test → build` on Ubuntu latest. All checks must pass before merge.

---

## 📖 Documentation

- **PLANNING.md** — Architecture decisions, tech stack, required tools
- **CLAUDE.md** — Coding standards, patterns, security checklist (the “source of truth” for code style)
- **TASK.md** — Detailed 16-milestone build checklist
- **SECURITY.md** — Hardening checklist and best practices
- **DEPLOYMENT.md** — Production provisioning and launch steps

---

## 🤝 Contributing

This is a private project under active development. External contributions are not currently accepted.

---

## 📄 License

MIT © Victor Chogo

---

## 🙋‍♂️ Author

Built by **Victor Chogo** — Full-Stack & AI Engineer based in Nairobi, Kenya.

Specialties: TypeScript, Python, AWS, Kubernetes, LLMs, RAG, fintech. Passionate about clean architecture, DevOps, and building tools that help small businesses thrive.

[LinkedIn](https://linkedin.com/in/victor-chogo) • [GitHub](https://github.com/vikkirikbane)

---

## ⚠️ Disclaimer

This software is provided “as is” without warranty of any kind. Use at your own risk. The authors are not liable for any damages arising from use.

---

*Ready to get paid faster?* Explore the docs, set up your environment, and start shipping invoices with confidence.
