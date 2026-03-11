# Neon PostgreSQL Integration Guide

This guide walks you through setting up Neon as the managed PostgreSQL provider for the Invoice-to-Cash SaaS project.

---

## 1. Create a Neon Account & Project

1. Visit https://neon.tech and sign up or log in.
2. Click **Create Project**.
3. Choose a name (e.g., `invoice-to-cash-saas`).
4. Select a region close to your Vercel deployment (e.g., `US East`).
5. Click **Create Project**.

Neon will provision a new database and display a **Connection Details** panel containing a `DATABASE_URL`.

Example:
```
postgresql://username:password@your-db-id.us-east-2.aws.neon.tech/your-db-name?sslmode=require
```

Copy this URL.

---

## 2. Configure Local Environment

1. In the project root, copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and set the `DATABASE_URL` to the Neon connection string you copied.
3. Also ensure `REDIS_URL` points to your Redis provider (e.g., Upstash) or local Redis (`redis://localhost:6379` for Docker).
4. Generate a strong `NEXTAUTH_SECRET` if you haven’t:
   ```bash
   openssl rand -base64 32
   ```
   Paste it into `.env.local`.
5. Fill in the remaining variables (Stripe, PayPal, AWS, etc.) as you provision those services.

---

## 3. Initialize the Database Schema

You have two options:

### Option A: Use Drizzle Kit (recommended)

The project includes Drizzle ORM with migration support.

```bash
# Generate a new migration from the current schema (if you changed it)
pnpm --filter @invoice/db db:generate

# Apply all pending migrations to the Neon database
pnpm --filter @invoice/db db:migrate
```

This will create the tables, enums, and indexes defined in `packages/db/src/schema`.

### Option B: Run raw SQL directly

The repository also contains a ready-to-use `schema.sql` file.

You can execute it in one of two ways:

- **Neon Console:** Open the Neon dashboard, go to your project, click **SQL Editor**, paste the contents of `schema.sql`, and run.
- **CLI:**
  ```bash
  psql "$DATABASE_URL" -f schema.sql
  ```

---

## 4. Seed Sample Data (Optional)

A seed script is provided to create a demo tenant and owner user.

```bash
pnpm --filter @invoice/db db:seed
```

This will:
- Create a tenant named `Acme Corp` (slug `acme-corp`)
- Create an owner user: `owner@example.com` with password `password` (bcrypt hash already in script)

You can modify the seed script (`packages/db/scripts/seed.ts`) to suit your needs.

---

## 5. Verify Connection

Start the development server:

```bash
pnpm dev
```

Visit http://localhost:3000 and try to register a new account. If everything is connected, you should be able to create a tenant and log in.

You can also check the Drizzle Studio UI:

```bash
pnpm --filter @invoice/db db:studio
```

This opens a visual database browser (if you have it installed) and should connect to your Neon DB.

---

## 6. Common Issues & Tips

- **SSL Mode:** Neon requires SSL. Ensure your `DATABASE_URL` includes `?sslmode=require` or `?sslmode=require` with `postgresql://`.
- **Connection Limits:** Neon uses a connection pooler. For serverless platforms (Vercel), keep your pool size small or use a serverless driver like `@vercel/postgres`. In development, the default pool is fine.
- **Migrations:** Drizzle Kit stores generated migrations in `packages/db/drizzle/`. Commit these to version control so production can apply them.
- **Resetting:** To start fresh, you can drop all tables via Neon console and re-run `schema.sql` or `db:migrate`.
- **Branching:** Neon supports branching for preview databases. See Neon docs for advanced workflows.

---

## 7. Next Steps

After completing Neon setup:

- Provision Redis (Upstash recommended) and set `REDIS_URL`.
- Set up AWS SES and S3 for email and PDF storage.
- Create Stripe and PayPal developer accounts and add keys to `.env.local`.
- Deploy to Vercel and set the same environment variables there.

See `DEPLOYMENT.md` for the full production checklist.

---

## 8. .env.local Example (partial)

```bash
DATABASE_URL=postgresql://username:password@your-db-id.us-east-2.aws.neon.tech/your-db-name?sslmode=require
REDIS_URL=rediss://default:password@your-upstash-host.redis.upstash.io:6379
NEXTAUTH_SECRET=your-generated-secret
NEXTAUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
NEXT_PUBLIC_PAYPAL_ENV=sandbox

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_SES_FROM_ADDRESS=invoices@yourdomain.com
AWS_S3_BUCKET_NAME=invoice-to-cash-files

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Invoice-to-Cash

# Observability
SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_DSN=...
```

---

Once your Neon DB is up and `.env.local` is configured, you’re ready to run migrations and start developing.

**Happy coding!**
