# Deployment Guide - Review Web

Complete guide for deploying the review-web application to production.

## Prerequisites

- Node.js 18+ installed
- Access to the FromFedToChain content directory
- Vercel account (for recommended deployment)

## Local Development Setup

### 1. Install Dependencies

```bash
cd review-web
npm install
```

### 2. Configure Content Directory Access

Create `.env.local` file:

```env
# Absolute path to FromFedToChain content directory
CONTENT_DIR=/absolute/path/to/FromFedToChain/content
```

**For default setup** (review-web and FromFedToChain as siblings):
```
/path/to/all-weather-protocol/
├── FromFedToChain/
│   └── content/
└── review-web/
```

No `.env.local` needed - default path is `../FromFedToChain/content`

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Production Deployment (Vercel)

### Option 1: Deploy from Git Repository (Recommended)

#### Step 1: Push to GitHub

1. Create a new GitHub repository
2. Push the `review-web` folder:

```bash
cd review-web
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/review-web.git
git push -u origin main
```

#### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (if review-web is root of repo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. Add Environment Variables:
   - Click "Environment Variables"
   - Add: `CONTENT_DIR` = `/absolute/path/to/content`

   **Important**: You need to handle content directory access. See "Content Access Strategies" below.

6. Click "Deploy"

### Option 2: Deploy from Vercel CLI

```bash
npm install -g vercel
cd review-web
vercel
```

Follow the prompts and set environment variables when asked.

## Content Access Strategies

Since the web app runs on Vercel's serverless functions, you need a strategy to access content files:

### Strategy A: Include Content in Deployment (Simple)

**Best for**: Small content repositories, infrequent updates

1. Copy content directory into review-web before deployment:

```bash
cp -r ../FromFedToChain/content ./content
```

2. Update `.env.local`:

```env
CONTENT_DIR=./content
```

3. Add to `.gitignore` to avoid committing:

```gitignore
# Content files (copied for deployment)
/content
```

4. Create a deployment script:

```bash
# scripts/deploy.sh
#!/bin/bash
echo "Copying content files..."
cp -r ../FromFedToChain/content ./content

echo "Deploying to Vercel..."
vercel --prod

echo "Cleaning up..."
rm -rf ./content
```

### Strategy B: API Proxy to FromFedToChain (Advanced)

**Best for**: Frequent content updates, large content repository

1. Add API routes in FromFedToChain to serve content:

```typescript
// FromFedToChain/src/api/content/[id].ts
export async function GET(req, { params }) {
  const content = await ContentManager.readSource(params.id);
  return Response.json(content);
}
```

2. Update review-web to fetch from API instead of file system

3. Set environment variable:

```env
CONTENT_API_URL=https://fromfedtochain-api.vercel.app/api/content
```

### Strategy C: Shared Storage (Production)

**Best for**: Production use, multiple services

1. Upload content to cloud storage (AWS S3, Cloudflare R2, etc.)
2. Sync content directory on deployment
3. Configure access credentials in environment variables

## Environment Variables

### Required

- `CONTENT_DIR` - Path to content directory (if using Strategy A)

### Optional

- `CONTENT_API_URL` - API URL for remote content (if using Strategy B)
- `NODE_ENV` - Set to `production` for production builds

## Build Verification

Before deploying, always test the build locally:

```bash
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) and verify:

- ✅ Review queue loads
- ✅ Content detail pages work
- ✅ Review submission works
- ✅ Navigation works
- ✅ No console errors

## Post-Deployment Checklist

- [ ] Verify deployment URL is accessible
- [ ] Test review queue page
- [ ] Test content detail and review submission
- [ ] Test navigation (previous/next)
- [ ] Test keyboard shortcuts (← →)
- [ ] Verify stats dashboard shows correct numbers
- [ ] Test review history page
- [ ] Check responsive design on mobile
- [ ] Verify no console errors in production

## Troubleshooting

### "Content not found" errors

**Cause**: Content directory path is incorrect

**Fix**:
1. Check `CONTENT_DIR` environment variable
2. Verify path is absolute (starts with `/`)
3. Ensure content files exist at the path

### Build failures on Vercel

**Cause**: Missing dependencies or TypeScript errors

**Fix**:
1. Run `npm run build` locally first
2. Check build logs on Vercel dashboard
3. Verify all dependencies are in `package.json`

### API routes returning 500 errors

**Cause**: File system access issues on serverless

**Fix**:
1. Check Vercel function logs
2. Verify content directory is accessible
3. Consider Strategy B (API proxy) instead

## Custom Domain

To add a custom domain:

1. Go to Vercel project settings
2. Click "Domains"
3. Add your domain (e.g., `review.fromfedtochain.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning

## Monitoring

### Vercel Analytics

Enable in project settings:
- Vercel Analytics - Real user metrics
- Speed Insights - Performance monitoring
- Error tracking

### Custom Monitoring

Add to `next.config.js`:

```javascript
module.exports = {
  // Enable runtime logs
  experimental: {
    logging: {
      level: 'info',
    },
  },
};
```

## Scaling Considerations

For high traffic:

1. **Enable Edge Functions**: Faster response times globally
2. **Optimize Content Loading**: Implement pagination and caching
3. **Add Redis Cache**: Cache content list and stats
4. **Use CDN**: Serve static assets from CDN

## Security

### Best Practices

1. **Authentication**: Add NextAuth.js for Phase 2
2. **Rate Limiting**: Implement API rate limits
3. **Input Validation**: Already implemented with Zod
4. **CORS**: Configure allowed origins
5. **Environment Variables**: Never commit secrets to git

### Example Security Headers

Add to `next.config.js`:

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};
```

## Rollback Procedure

If deployment has issues:

1. Go to Vercel dashboard
2. Click "Deployments"
3. Find previous stable deployment
4. Click "..." → "Promote to Production"

Or via CLI:

```bash
vercel rollback
```

## Support

For issues:

1. Check Vercel function logs
2. Review build logs
3. Test locally with `npm run build && npm run start`
4. Check this guide's troubleshooting section

## Next Steps

After successful deployment:

- [ ] Set up monitoring and alerts
- [ ] Configure custom domain
- [ ] Plan Phase 2 features (authentication, multi-user)
- [ ] Collect user feedback
- [ ] Iterate on UI/UX improvements

---

Last updated: 2024-07-21
