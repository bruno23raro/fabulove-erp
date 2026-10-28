# SIZEN ERP — Infrastructure Documentation

## Deployment Targets

| Target | Status | Notes |
|--------|--------|-------|
| Local (PostgreSQL) | ✅ Active | DB runs locally on port 5432 |
| Supabase Cloud | ⏳ Pending | Requires manual login + `supabase login` |
| Vercel | ⏳ Pending | Requires manual login + `vercel login` |
| GitHub Actions CI | ✅ Active | Runs lint + test + build on push |

## Cloud Setup Steps (Manual)

### Supabase Cloud Migration
```bash
# 1. Login to Supabase CLI
npx supabase login

# 2. Create a new project at https://supabase.com/dashboard
# 3. Link to existing project
npx supabase link --project-ref <your-project-ref>

# 4. Run migrations
npx supabase db push
```

### Vercel Deployment
```bash
# 1. Login to Vercel
npx vercel login

# 2. Create project (if not already)
npx vercel --yes

# 3. Deploy to production
npx vercel --prod
```

## Environment Variables

All secrets must be stored in `.env` (gitignored) and deployed via:
- **Supabase**: Project settings → Database → Connection string
- **Vercel**: Project settings → Environment Variables

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=7d

# Email (Resend recommended)
RESEND_API_KEY=re_...

# AI Providers
NVIDIA_NIM_API_KEY=...
AGNES_AI_API_KEY=...

# Marketplaces
ML_CLIENT_ID=...
ML_CLIENT_SECRET=...
SHOPEE_PARTNER_ID=...
SHOPEE_PARTNER_KEY=...
```

## Security Notes

- Never commit `.env` or `CREDENTIALS.local.md`
- Marketplace tokens are stored in `marketplace_accounts` table (plaintext in current implementation)
- Consider adding pgcrypto encryption for token storage (see task #7 in STATUS_PROJETO.md)