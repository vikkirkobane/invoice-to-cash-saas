# Local Development Setup Guide

This guide will get the Invoice-to-Cash SaaS running on your local machine for development and testing.

---

## Prerequisites

Ensure you have the following installed:

- **Node.js 20** (use nvm or asdf for version management)
- **pnpm 8** (install via `npm install -g pnpm@8`)
- **Docker Desktop** (includes Docker Compose)
- **Git**
- (Optional) **VS Code** with recommended extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Drizzle ORM
  - GitLens

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/vikkirkobane/invoice-to-cash-saas.git
cd invoice-to-cash-saas
```

---

## Step 2: Install Dependencies

```bash
pnpm install
```

This will install all workspace packages and link them together.

---

## Step 3: Start Local Infrastructure

We use Docker Compose to run PostgreSQL 15 and Redis 7 locally.

```bash
docker compose up -d
```

- PostgreSQL will be available at `localhost:5432`
- Redis will be available at `localhost:6379`

To stop:
```bash
docker compose down
```

To view logs:
```bash
docker compose logs -f
```

---

## Step 4: Configure Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your values. At minimum, set:

   ```bash
   # Database (local Docker)
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invoice_cash?sslmode=prefer

   # Redis (local Docker)
   REDIS_URL=redis://localhost:6379

   # NextAuth secret (generate a strong random string)
   NEXTAUTH_SECRET=$(openssl rand -base64 32)
   NEXTAUTH_URL=http://localhost:3000

   # Stripe (use test keys from stripe.com)
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...  # for local testing, see Stripe CLI section below

   # PayPal (sandbox keys from developer.paypal.com)
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   PAYPAL_WEBHOOK_ID=...
   NEXT_PUBLIC_PAYPAL_ENV=sandbox

   # AWS (for SES and S3 - you can use localstack for full local testing, but for dev you can use real AWS sandbox)
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   AWS_SES_FROM_ADDRESS=invoices@localhost.local  # use a verified email in SES sandbox
   AWS_S3_BUCKET_NAME=invoice-to-cash-local

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_APP_NAME=Invoice-to-Cash

   # Observability (optional)
   SENTRY_DSN=
   NEXT_PUBLIC_SENTRY_DSN=
   ```

   > Note: For email and file storage, you can use real AWS accounts in sandbox mode, or use localstack/mocks for full offline development. See “Optional: Local AWS” below.

---

## Step 5: Run Database Migrations

We use Drizzle ORM with migrations stored in `packages/db/drizzle`.

```bash
pnpm --filter @invoice/db db:migrate
```

Expected output: `Migrations complete.`

If you need to generate a new migration after changing the schema:

```bash
pnpm --filter @invoice/db db:generate
```

---

## Step 6: Seed Sample Data (Optional)

The seed script creates a demo tenant and an owner user.

```bash
pnpm --filter @invoice/db db:seed
```

Output:
```
Seeded: { tenant: {...}, owner: {...} }
```

Default owner credentials:
- Email: `owner@example.com`
- Password: `password` (bcrypt hash in seed)

You can modify `packages/db/scripts/seed.ts` to customize.

---

## Step 7: Start the Development Server

```bash
pnpm dev
```

This will:
- Start Next.js development server on http://localhost:3000
- Run Turborepo pipeline concurrently

Open http://localhost:3000 in your browser. You should see the home page.

---

## Step 8: Access the Application

- **Home page**: http://localhost:3000
- **Login**: http://localhost:3000/login (use seeded `owner@example.com` / `password`)
- **Dashboard**: http://localhost:3000/dashboard
- **Bull Board** (queue UI, Owner only): http://localhost:3000/admin/queues (UI placeholder)
- **Drizzle Studio** (database browser):
  ```bash
  pnpm --filter @invoice/db db:studio
  ```
  Usually at http://localhost:4983

---

## Optional: Local Stripe & PayPal Webhook Testing

### Stripe

Install Stripe CLI and forward events to your local server:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Stripe CLI will output a `whsec_...` webhook secret. Set that as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

Trigger test events:
```bash
stripe trigger payment_intent.succeeded
```

### PayPal

PayPal doesn’t have a native CLI forwarder. Use ngrok to expose your localhost:

```bash
ngrok http 3000
```

Then in PayPal Developer Dashboard, set the webhook URL to the `https://<ngrok-subdomain>.ngrok-free.app/api/webhooks/paypal`.

---

## Optional: Local AWS (SES + S3)

If you want to avoid using real AWS during development, you can:

- **Emulate SES**: use [MailHog](https://github.com/mailhog/MailHog) or [Papercut](https://github.com/ChangemakerStudios/Papercut) for local SMTP. You’d need to adjust `EmailService` to use SMTP instead of AWS SDK.
- **Emulate S3**: use [LocalStack](https://localstack.cloud/) or [MinIO](https://min.io/). For S3 SDK compatibility, set `AWS_ENDPOINT_URL` and adjust `PdfService` and `EmailService` accordingly.

For simplicity, many devs use real AWS sandbox accounts (SES sandbox allows only verified sender/recipient emails). That’s the recommended path for v1.0.

---

## Optional: Branching with Neon

Neon supports **branches** for isolated preview databases. See Neon docs for creating a branch and updating `DATABASE_URL` accordingly. This is great for feature branches and CI.

---

## Common Issues & Troubleshooting

### 1. Database connection refused
- Ensure Docker is running and `docker compose up -d` completed successfully.
- Check `DATABASE_URL` in `.env.local` — host `localhost`, port `5432`, user `postgres`, password `postgres`.
- Try `docker compose logs postgres` to see if the container is healthy.

### 2. Migrations fail with “relation already exists”
- You may have already created tables manually. Drop the database and recreate:
  ```bash
  docker compose down -v  # removes volumes (deletes data)
  docker compose up -d
  pnpm --filter @invoice/db db:migrate
  ```

### 3. Port 3000 already in use
- Change Next.js port: `PORT=3001 pnpm dev`
- Or kill the process using port 3000 (common on macOS/Linux: `lsof -i :3000` and `kill -9 <PID>`)

### 4. “Module not found” errors after adding a new package
- Ensure you ran `pnpm install` after modifying any `package.json`.
- If the issue persists, try `pnpm install --recursive` from the repo root.

### 5. ESLint or Prettier not running on save
- Install the recommended VS Code extensions.
- Or run manually:
  ```bash
  pnpm lint
  pnpm format
  ```

### 6. HMR not working in Next.js
- Ensure `app/` pages are using Server Components where appropriate. Client Component boundaries (`'use client'`) should be minimal.
- Check browser console for errors; sometimes stale caches cause issues — do a hard refresh (Ctrl+Shift+R).

### 7. Redis connection error
- Confirm `docker compose ps` shows `redis` container up.
- `REDIS_URL` should be `redis://localhost:6379` for local.
- If using Upstash in production, keep that value only in production env; for local use the Docker value.

### 8. Sentry errors on startup
- If `SENTRY_DSN` is empty, Sentry should be a no-op. Make sure it’s blank or remove the env variable.

---

## IDE Configuration (VS Code)

- **Settings**:
  - `Editor.formatOnSave`: true
  - `Editor.defaultFormatter`: `esbenp.prettier-vscode`
- **Extensions** (see Prerequisites).
- **Workspace trust**: enable for this project to allow auto-formatting.

---

## Running Tests

```bash
# All projects
pnpm test

# Web app only
pnpm --filter @invoice/web test

# E2E (Playwright)
pnpm e2e
```

Make sure the dev server is not running when running Vitest; they can run concurrently but may conflict on ports if you use `--watch`.

---

## Code Quality

Before committing, Husky will run `lint-staged` to lint and format staged files. To manually lint:

```bash
pnpm lint
```

To format all files:

```bash
pnpm format
```

---

## Project Scripts Reference

| Script | Description |
|---|---|
| `pnpm dev` | Start Next.js dev server (port 3000) |
| `pnpm build` | Build all packages and apps |
| `pnpm start` | Start production build |
| `pnpm lint` | Lint all packages |
| `pnpm type-check` | Run TypeScript compiler (noEmit) |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm e2e` | Run Playwright E2E tests |
| `pnpm --filter @invoice/db db:migrate` | Apply DB migrations |
| `pnpm --filter @invoice/db db:generate` | Generate new migration |
| `pnpm --filter @invoice/db db:seed` | Seed sample data |
| `pnpm --filter @invoice/db db:studio` | Open Drizzle Studio |

---

## Next Steps After Local Setup

Once everything is running:

1. Play with the app: register a new tenant, create a customer, draft an invoice.
2. Configure Stripe/PayPal test keys and try a test payment.
3. Set up Vercel and deploy (see `DEPLOYMENT.md`).
4. Check `SECURITY.md` for hardening before going public.

Happy coding!

---

## Support

If you hit a snag, check:
- GitHub Issues (if this were a public repo)
- CLAUDE.md for coding standards
- TASK.md for the full build checklist

For environment-specific issues, review the `.env.example` keys carefully.
