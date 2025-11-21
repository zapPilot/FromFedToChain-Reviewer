# Pipeline Setup Guide

Complete guide for setting up the content processing pipeline (translation, audio generation, and Cloudflare R2 uploads).

## Prerequisites

### 1. System Dependencies

Install the following tools on your system:

#### FFmpeg (Required for audio processing)

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows (via Chocolatey)
choco install ffmpeg

# Verify installation
ffmpeg -version
```

#### rclone (Required for Cloudflare R2 uploads)

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Verify installation
rclone version
```

### 2. Configure rclone for Cloudflare R2

```bash
rclone config create r2 s3 \
  provider=Cloudflare \
  access_key_id=YOUR_ACCESS_KEY \
  secret_access_key=YOUR_SECRET_KEY \
  endpoint=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  region=auto
```

Verify configuration:

```bash
rclone lsd r2:
```

### 3. Google Cloud Setup

1. Create a [Google Cloud Project](https://console.cloud.google.com/)
2. Enable the following APIs:
   - [Cloud Text-to-Speech API](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)
   - [Cloud Translation API](https://console.cloud.google.com/apis/library/translate.googleapis.com)
3. Create a service account with the following roles:
   - **Cloud Translation API User**
   - **Cloud Text-to-Speech API User**
4. Download the service account JSON key
5. Save it as `service-account.json` in the project root

**Important**: Ensure `service-account.json` is listed in `.gitignore` to avoid committing credentials.

---

## Environment Configuration

Add these variables to your `.env.local`:

```bash
# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Cloudflare R2 Configuration
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket-url.r2.dev

# Optional: Claude API for social hooks
ANTHROPIC_API_KEY=your-claude-api-key-here
```

---

## Testing the Pipeline

### 1. Test Translation

```bash
curl -X POST http://localhost:3000/api/pipeline/translate \
  -H "Content-Type: application/json" \
  -d '{"contentId": "content-123", "targetLanguage": "en-US"}'
```

### 2. Test Audio Generation

```bash
curl -X POST http://localhost:3000/api/pipeline/generate-audio \
  -H "Content-Type: application/json" \
  -d '{"contentId": "content-123", "language": "en-US", "format": "wav"}'
```

### 3. Test Cloudflare R2 Upload

```bash
curl -X POST http://localhost:3000/api/pipeline/upload \
  -H "Content-Type: application/json" \
  -d '{"contentId": "content-123", "language": "en-US", "format": "both"}'
```

### 4. Test Full Pipeline

```bash
curl -X POST http://localhost:3000/api/pipeline/process \
  -H "Content-Type: application/json" \
  -d '{"contentId": "content-123"}'
```

---

## Troubleshooting

### FFmpeg Not Found

```
Error: ffmpeg not found
```

**Solution**: Install FFmpeg using your package manager (see Prerequisites)

### rclone Not Configured

```
Error: remote "r2" not found
```

**Solution**: Configure rclone for Cloudflare R2 (see Prerequisites step 2)

### Google Cloud Authentication Failed

```
Error: Google Cloud authentication failed
```

**Solution**:

1. Verify `service-account.json` exists in project root
2. Verify `GOOGLE_APPLICATION_CREDENTIALS` in `.env.local` points to the file
3. Ensure the service account has the required API roles
4. Check that the APIs are enabled in your Google Cloud project

### rclone Permission Denied

```
Error: Failed to create file on r2
```

**Solution**:

1. Verify your R2 bucket exists: `rclone lsd r2:`
2. Check your access key has write permissions
3. Verify the endpoint URL matches your Cloudflare account ID

---

## Pipeline API Reference

### POST /api/pipeline/translate

Translate content to target language using Google Translate.

**Request**:

```json
{
  "contentId": "content-123",
  "targetLanguage": "en-US"
}
```

**Response**:

```json
{
  "success": true,
  "content": { "id": "content-123", "language": "en-US", ... }
}
```

### POST /api/pipeline/generate-audio

Generate audio files (WAV and M3U8) using Google Text-to-Speech.

**Request**:

```json
{
  "contentId": "content-123",
  "language": "en-US",
  "format": "wav" // or "m3u8" or "both"
}
```

### POST /api/pipeline/upload

Upload audio files to Cloudflare R2.

**Request**:

```json
{
  "contentId": "content-123",
  "language": "en-US",
  "format": "both" // or "wav" or "m3u8"
}
```

### POST /api/pipeline/process

Process full pipeline (translate → audio → upload).

**Request**:

```json
{
  "contentId": "content-123",
  "startFrom": "translate" // optional: "translate", "audio", "upload"
}
```

### GET /api/pipeline/process?contentId=...

Get pipeline processing status.

---

## Next Steps

1. ✅ Install system dependencies (FFmpeg, rclone)
2. ✅ Configure Google Cloud credentials
3. ✅ Configure Cloudflare R2 via rclone
4. ✅ Set environment variables
5. ✅ Test each pipeline step
6. 🚀 Start processing content!

For Fly.io deployment with pipeline support, see [docs/deployment/flyio.md](../deployment/flyio.md).
