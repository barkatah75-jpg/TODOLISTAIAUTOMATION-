# Hostinger Deployment - barkataiautomation.in

Target domain: `https://barkataiautomation.in`

This project is a Next.js server app. Do not deploy it as a static `public_html` site.

## Hostinger Node.js App Settings

- Domain: `barkataiautomation.in`
- Node.js version: `20` or newer
- Install command: `npm ci --no-audit --no-fund`
- Build command: `npm run build`
- Start command: `npm run start`
- Application port: use Hostinger's assigned port or `3000` if requested
- Environment file: use `.env.hostinger.example` as the variable checklist

## Required Setup Before Going Live

1. Back up the current `barkataiautomation.in` site because this deployment replaces it.
2. Create/configure Supabase project.
3. Run all SQL files in `supabase/migrations` in order.
4. Create Supabase storage buckets: `avatars`, `drawings`, `files`.
5. Set all Hostinger environment variables from `.env.hostinger.example`.
6. Update Supabase Auth site URL to `https://barkataiautomation.in`.
7. Add redirect URL: `https://barkataiautomation.in/auth/callback`.
8. Configure payment webhooks:
   - Razorpay: `https://barkataiautomation.in/api/webhooks/razorpay`
   - PayPal: `https://barkataiautomation.in/api/webhooks/paypal`

## Verification URLs

- Home: `https://barkataiautomation.in`
- Health: `https://barkataiautomation.in/api/health`
- Login: `https://barkataiautomation.in/auth/login`
- Register: `https://barkataiautomation.in/auth/register`
