# Review Web - Deployment Guide

This guide walks you through deploying the review-web application to Fly.io with Supabase integration.

## Prerequisites

- [Fly.io account](https://fly.io/app/sign-up) (free tier available)
- [Supabase project](https://app.supabase.com/) (free tier available)
- flyctl CLI installed: `curl -L https://fly.io/install.sh | sh`

---

## Step 1: Set Up Supabase Database

### 1.1 Run Schema Creation Script

1. Go to your Supabase Dashboard: https://app.supabase.com/
2. Navigate to **SQL Editor**
3. Open the file `database/schema.sql` from this repository
4. Copy and paste the entire SQL script into the editor
5. Click **Run** to create the schema and tables

### 1.2 Verify Tables Created

Run this query to confirm:

```sql
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'review_web';
```

You should see:

- `content_status`
- `pipeline_jobs`

### 1.3 Get Supabase Credentials

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (⚠️ Keep secret!)

---

## Step 2: Deploy to Fly.io

### 2.1 Initialize Fly.io App

```bash
cd review-web

# Login to Fly.io
fly auth login

# Launch the app (fly.toml already configured)
fly launch --no-deploy
```

When prompted:

- ✅ Use existing `fly.toml`? **Yes**
- ✅ Create a PostgreSQL database? **No** (we're using Supabase)
- ✅ Create a Redis database? **No**

### 2.2 Set Environment Secrets

```bash
# Supabase credentials (REQUIRED)
fly secrets set \
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_KEY=your_service_role_key_here \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Content directory (Optional - defaults to ../FromFedToChain/content)
# Only set if your content is in a different location
# fly secrets set CONTENT_DIR=/app/content

# Google Cloud credentials (Optional - if not using GitHub Actions for pipeline)
# fly secrets set GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json
```

**⚠️ Important**: Never commit the service role key to Git!

### 2.3 Deploy

```bash
# Deploy the application
fly deploy

# Check deployment status
fly status

# View logs
fly logs
```

### 2.4 Access Your App

```bash
# Open in browser
fly open
```

Your app will be available at: `https://review-web.fly.dev`

---

## Step 3: Set Up Content Directory

The app needs access to the `FromFedToChain/content` directory. Options:

### Option A: Mount as Volume (Recommended for Production)

```bash
# Create volume
fly volumes create content_data --size 1

# Update fly.toml to mount volume
[[mounts]]
  source = "content_data"
  destination = "/app/content"

# Redeploy
fly deploy
```

Then upload content:

```bash
# Copy content to volume
fly ssh console
cd /app/content
# Upload files via scp or git clone
```

### Option B: Symlink from Local (Development Only)

Set `CONTENT_DIR` to point to your local FromFedToChain repo:

```bash
fly secrets set CONTENT_DIR=../FromFedToChain/content
```

---

## Step 4: Verify Deployment

### 4.1 Test API Endpoints

```bash
# Check stats
curl https://review-web.fly.dev/api/review/stats

# Check pending content
curl https://review-web.fly.dev/api/review/pending?page=1&limit=10
```

### 4.2 Test Review Submission

1. Open the app in your browser
2. Navigate to `/review`
3. Try submitting a review (accept/reject)
4. Check Supabase to verify the row was created:

```sql
SELECT * FROM review_web.content_status ORDER BY updated_at DESC LIMIT 10;
```

---

## Troubleshooting

### Issue: "Missing SUPABASE_SERVICE_KEY"

```bash
# Verify secrets are set
fly secrets list

# Re-set if missing
fly secrets set SUPABASE_SERVICE_KEY=your_key_here
```

### Issue: "Content not found"

Check that `CONTENT_DIR` points to the correct location:

```bash
fly ssh console
ls -la $CONTENT_DIR
```

### Issue: Supabase Connection Failed

1. Check if your Supabase project is paused (free tier pauses after inactivity)
2. Verify the URL and keys are correct
3. Check Supabase logs in the dashboard

### Issue: Build Failed

```bash
# View detailed logs
fly logs

# Check Node.js version
# Update fly.toml if needed: NODE_VERSION = "20"
```

---

## Scaling & Performance

### Free Tier Limits

- 3 shared VMs
- 160GB bandwidth/month
- Apps sleep after inactivity (cold start: 1-2s)

### Upgrade for Production

```bash
# Scale to prevent cold starts
fly scale count 2 --region sjc

# Increase resources
fly scale vm shared-cpu-2x --memory 512
```

---

## Environment Variables Reference

| Variable                         | Required | Description                                                      |
| -------------------------------- | -------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | ✅       | Supabase project URL                                             |
| `SUPABASE_SERVICE_KEY`           | ✅       | Supabase service role key (server-side)                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | ✅       | Supabase anon key (client-side)                                  |
| `CONTENT_DIR`                    | ⚠️       | Path to content directory (default: `../FromFedToChain/content`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | ❌       | Google Cloud service account (if using pipeline)                 |

---

## Next Steps

1. ✅ **Monitor**: `fly logs --tail`
2. ✅ **Set up domains**: `fly domains`
3. ✅ **Configure GitHub Actions** for translation pipeline (see Phase 4 in main plan)
4. ✅ **Enable metrics**: `fly dashboard`

---

## Cost Estimate

- **Fly.io**: Free tier (sufficient for personal use)
- **Supabase**: Free tier (500MB database, 5GB bandwidth)
- **Total**: **$0/month** 🎉

Upgrade if:

- Traffic > 160GB/month
- Need 24/7 uptime (no cold starts)
- Database > 500MB

---

## Support

- Fly.io docs: https://fly.io/docs/
- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs
