# AIVANA Kids OS — Deployment Guide

## Prerequisites
- Node.js 20+
- Supabase account (free tier works)
- Vercel account (or Docker/VPS)
- API keys (see .env.example)

---

## 1. Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Create new project at supabase.com/dashboard
# Get your project URL and keys

# Run migrations
supabase db push --db-url "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"
# OR paste supabase/migrations/001_initial_schema.sql in Supabase SQL Editor

# Create Storage buckets (in Supabase dashboard > Storage):
# - avatars (public)
# - drawings (private)
# - files (private)
```

**Enable Google OAuth:**
1. Supabase Dashboard → Authentication → Providers → Google
2. Add your Google OAuth credentials from console.cloud.google.com
3. Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`

---

## 2. Environment Setup

```bash
cp .env.example .env.local
# Fill in all values from .env.example
```

**Generate VAPID keys for push notifications:**
```bash
npx web-push generate-vapid-keys
```

---

## 3. Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
# ... add all env vars

# Deploy to production
vercel --prod
```

**Set GitHub Secrets for CI/CD:**
```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
ANTHROPIC_API_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
NEXT_PUBLIC_RAZORPAY_KEY_ID
RESEND_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
VAPID_PRIVATE_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_EMAIL
NEXT_PUBLIC_APP_URL
```

---

## 4. Deploy with Docker

```bash
# Build
docker build -t aivana-kids-os \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your_url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  .

# Run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f app
```

---

## 5. Razorpay Setup

1. Create account at razorpay.com
2. Get Test API keys from Dashboard → Settings → API Keys
3. Add webhook: Dashboard → Webhooks → Add webhook
   - URL: `https://your-domain.com/api/payments/razorpay/webhook`
   - Events: `payment.captured`, `subscription.activated`
4. Switch to Live keys for production

---

## 6. PayPal Setup (Global)

1. Create app at developer.paypal.com
2. Get Client ID and Secret
3. Add webhook URL in PayPal Developer Dashboard

---

## 7. Upstash Redis (Rate Limiting)

1. Create free account at upstash.com
2. Create Redis database
3. Copy REST URL and token to .env

---

## 8. Resend (Email)

1. Create account at resend.com
2. Add and verify your domain
3. Create API key
4. Update `EMAIL_FROM` in .env

---

## 9. Google Vision API (Optional OCR Upgrade)

1. Enable Vision API in Google Cloud Console
2. Create API key with Vision API scope
3. Add `GOOGLE_VISION_API_KEY` to .env
4. Tesseract.js works without this (free fallback)

---

## Development

```bash
npm install
npm run dev        # Start dev server on :3000
npm run type-check # TypeScript validation
npm run lint       # ESLint
npm run db:types   # Regenerate DB types from Supabase
```

---

## Folder Structure

```
aivana-kids-os/
├── app/
│   ├── auth/           # Login, verify, OAuth callback
│   ├── child/          # Child dashboard, todos, AI chat, drawing, files, rewards
│   ├── parent/         # Parent dashboard, children, analytics, tasks
│   ├── api/            # REST API routes
│   ├── pricing/        # Pricing page
│   └── layout.tsx      # Root layout
├── components/
│   ├── child/          # Child-specific UI
│   ├── parent/         # Parent-specific UI
│   ├── gamification/   # XP bar, badges, missions
│   └── shared/         # Providers, navbar
├── lib/
│   ├── actions/        # Server Actions (todos, parent, ai)
│   ├── ai/             # Claude API integration
│   ├── supabase/       # Client, server, admin clients
│   ├── pdf/            # PDF compression
│   ├── ocr/            # Tesseract.js + Google Vision
│   ├── notifications/  # Web Push
│   ├── payments/       # Razorpay + PayPal
│   └── utils/          # Rate limiting, subscription checks
├── hooks/              # useRewards, useVoiceInput
├── types/              # TypeScript database types
├── supabase/
│   └── migrations/     # SQL schema
├── public/
│   └── manifest.json   # PWA manifest
├── .github/workflows/  # CI/CD
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Security Checklist

- [x] Supabase RLS on all tables
- [x] Input validation with Zod on all API routes
- [x] Rate limiting with Upstash Redis
- [x] JWT signature verification for payments
- [x] Security headers (X-Frame-Options, CSP, etc.)
- [x] Service Role key never exposed to client
- [x] Parent-child relationship verified before data access
- [x] File type + size validation on uploads
- [ ] Add CAPTCHA to auth pages (reCAPTCHA v3)
- [ ] Content Security Policy headers
- [ ] Regular dependency audit: `npm audit`
