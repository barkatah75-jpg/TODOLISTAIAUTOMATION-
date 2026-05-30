# AIVANA Kids OS 🚀

> AI-powered full-stack SaaS platform for children's learning and task management.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)

---

## ✨ Features

| Feature | Tech Used | Status |
|---------|-----------|--------|
| Email OTP + Google OAuth | Supabase Auth | ✅ |
| Role-based access (Child/Parent) | Middleware + RLS | ✅ |
| Todo CRUD with XP | Server Actions + PostgreSQL | ✅ |
| Real PDF Compression | pdf-lib + sharp | ✅ |
| Real OCR Scanner | Tesseract.js + Google Vision | ✅ |
| Voice Input (EN + HI) | Web Speech API | ✅ |
| AI Homework Helper | Claude API (claude-opus-4-5) | ✅ |
| AI Task Suggestions | Claude API (claude-haiku) | ✅ |
| XP & Leveling System | PostgreSQL Functions | ✅ |
| Streak Tracking | PostgreSQL Functions | ✅ |
| Daily/Weekly Missions | Auto-assign API | ✅ |
| Badge System (12 types) | Auto-award on events | ✅ |
| Drawing Canvas | HTML5 Canvas + Supabase Storage | ✅ |
| Parent Dashboard | Real-time Supabase | ✅ |
| Task Approval Workflow | Parent actions | ✅ |
| Analytics Charts | Recharts | ✅ |
| Leaderboard | Family + Global | ✅ |
| Razorpay (India) | Full order + verify | ✅ |
| PayPal (Global) | Order + capture | ✅ |
| Push Notifications | web-push VAPID | ✅ |
| PWA + Offline | next-pwa + Service Worker | ✅ |
| Dark Mode | next-themes | ✅ |
| Rate Limiting | Upstash Redis | ✅ |
| Email (Welcome, Reports) | Resend | ✅ |
| CI/CD | GitHub Actions + Vercel | ✅ |
| Docker | Multi-stage Dockerfile | ✅ |

---

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-org/aivana-kids-os.git
cd aivana-kids-os
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
# Edit .env.local with your keys
```

### 3. Set up Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Copy URL and keys to `.env.local`
3. Run migrations:
   - Paste `supabase/migrations/001_initial_schema.sql` in SQL Editor
   - Paste `supabase/migrations/002_functions_indexes.sql` in SQL Editor
4. Create Storage buckets: `avatars` (public), `drawings` (private), `files` (private)
5. Enable Google OAuth in Supabase Dashboard → Auth → Providers

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
aivana-kids-os/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout (PWA, themes)
│   ├── auth/
│   │   ├── login/page.tsx          # Email OTP + Google login
│   │   ├── register/page.tsx       # New user registration
│   │   ├── verify/page.tsx         # OTP verification
│   │   └── callback/route.ts       # Google OAuth callback
│   ├── child/
│   │   ├── dashboard/page.tsx      # Main child dashboard
│   │   ├── todos/page.tsx          # Task management
│   │   ├── ai-chat/page.tsx        # AIVA AI helper
│   │   ├── drawing/page.tsx        # Drawing studio
│   │   ├── files/page.tsx          # PDF + OCR tools
│   │   ├── rewards/page.tsx        # XP, badges, redemptions
│   │   ├── leaderboard/page.tsx    # Family rankings
│   │   ├── profile/page.tsx        # Settings, avatar
│   │   └── onboarding/page.tsx     # First-time setup
│   ├── parent/
│   │   ├── dashboard/page.tsx      # Parent overview
│   │   ├── children/               # Manage children
│   │   ├── tasks/page.tsx          # Assign tasks
│   │   ├── analytics/page.tsx      # Progress charts
│   │   ├── rewards/page.tsx        # Create reward store
│   │   ├── settings/page.tsx       # Account settings
│   │   └── onboarding/page.tsx     # Parent setup flow
│   ├── api/
│   │   ├── ai/chat/route.ts        # Claude AI endpoint
│   │   ├── ocr/scan/route.ts       # OCR processing
│   │   ├── pdf/compress/route.ts   # PDF compression
│   │   ├── payments/
│   │   │   ├── razorpay/           # Indian payments
│   │   │   └── paypal/             # Global payments
│   │   ├── notifications/          # Push notification sub
│   │   ├── missions/today/         # Daily mission assignment
│   │   ├── rewards/leaderboard/    # Rankings
│   │   └── health/route.ts         # Health check
│   └── pricing/page.tsx            # Pricing page
├── components/
│   ├── child/                      # Child UI components
│   ├── parent/                     # Parent UI components
│   ├── gamification/               # XP bar, badges, missions
│   └── shared/                     # Providers, common
├── lib/
│   ├── actions/                    # Server Actions
│   │   ├── todos.ts               # CRUD + complete + XP
│   │   ├── parent.ts              # Approve, assign, invite
│   │   └── ai.ts                  # AI suggestion wrapper
│   ├── ai/homeworkHelper.ts        # Claude API integration
│   ├── email/sender.ts             # Resend email templates
│   ├── notifications/webpush.ts    # Push notifications
│   ├── ocr/scanner.ts              # Tesseract + Google Vision
│   ├── pdf/compress.ts             # pdf-lib compression
│   ├── supabase/                   # Browser/server/admin clients
│   └── utils/
│       ├── rateLimit.ts           # Upstash Redis rate limiting
│       └── subscription.ts        # Plan limit checks
├── hooks/
│   ├── useRewards.ts              # Real-time XP updates
│   ├── useTodos.ts                # Real-time todo sync
│   ├── useVoiceInput.ts           # Web Speech API
│   └── useSound.ts                # Web Audio sound effects
├── types/database.ts               # TypeScript types
├── supabase/migrations/            # SQL schema + functions
├── middleware.ts                   # Auth + role routing
├── Dockerfile                      # Production container
├── docker-compose.yml              # Full stack local
└── .github/workflows/ci-cd.yml    # GitHub Actions
```

---

## 🗄️ Database Schema

13 tables with full Row Level Security:

- **profiles** — Extended user data (role, avatar, settings)
- **family_links** — Parent-child relationships
- **subscriptions** — Plan management
- **todos** — Tasks with XP, categories, approval
- **rewards** — XP totals, levels, streaks
- **badges** — 12 achievement types
- **xp_transactions** — Full XP audit log
- **missions** — Daily/weekly challenge definitions
- **user_missions** — Assigned mission progress
- **drawings** — Canvas artwork
- **files** — PDF and image records
- **ai_conversations** — Chat history
- **parent_rewards** — Custom reward store
- **push_subscriptions** — VAPID push endpoints
- **payments** — Payment records (Razorpay + PayPal)

---

## 💳 Pricing

| Plan | Price | Children | AI | Tasks/day |
|------|-------|----------|-----|-----------|
| Free | ₹0 | 1 | ❌ | 10 |
| Pro | ₹299/mo | 1 | ✅ | Unlimited |
| Family | ₹499/mo | 5 | ✅ | Unlimited |

---

## 🔐 Security

- Supabase RLS on all 15 tables
- Input validation with Zod on every API route
- Rate limiting via Upstash Redis
- HMAC signature verification for Razorpay
- Parent-child relationship verified before all cross-user operations
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Service Role key never exposed to client bundle

---

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full step-by-step instructions.

**Quick Vercel deploy:**
```bash
vercel --prod
```

**Docker:**
```bash
docker-compose up -d
```

---

## 📞 Support

- Email: support@aivana.app
- Docs: aivana.app/docs

---

## 📄 License

MIT License © 2025 AIVANA
