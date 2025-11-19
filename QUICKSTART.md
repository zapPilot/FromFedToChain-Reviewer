# Quick Start Guide

Get the review-web application running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- FromFedToChain content directory accessible

## Setup Steps

### 1. Install Dependencies

```bash
cd review-web
npm install
```

### 2. Configure Content Path (Optional)

If FromFedToChain is NOT a sibling directory, create `.env.local`:

```env
CONTENT_DIR=/absolute/path/to/FromFedToChain/content
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Open Browser

Navigate to: [http://localhost:3000](http://localhost:3000)

## What You'll See

1. **Review Queue** (`/review`) - List of pending content
   - Stats dashboard
   - Category filters
   - Search functionality
   - Content cards

2. **Content Review** (`/review/[id]`) - Review individual content
   - Full content display
   - Review form (Accept/Reject)
   - Category editing
   - Navigation buttons
   - Keyboard shortcuts (← →)

3. **Review History** (`/review/history`) - Past reviews
   - All reviewed content
   - Filter by decision
   - Review timestamps

## Quick Test

1. Visit http://localhost:3000
2. You should see the review queue with pending content
3. Click any content card to open detail view
4. Try the review form:
   - Select "Accept" or "Reject"
   - Add feedback (required for reject)
   - Click "Submit Review"
5. Content should update and navigate to next item

## Keyboard Shortcuts

- `←` Previous content
- `→` Next content
- `Enter` Submit review (when focused on submit button)

## Troubleshooting

### "No content to review"

**Cause**: No draft content in FromFedToChain

**Fix**: Create test content in FromFedToChain:

```bash
cd ../FromFedToChain
npm run create-content
```

### "Content not found" error

**Cause**: Content path is wrong

**Fix**: Check `.env.local` or verify FromFedToChain is sibling directory

### Port 3000 already in use

**Fix**: Use different port:

```bash
npm run dev -- -p 3001
```

## Next Steps

- Review the [README.md](./README.md) for full documentation
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Start reviewing content!

---

Need help? Check the main README or open an issue.
