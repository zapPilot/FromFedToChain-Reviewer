#!/bin/bash
set -e

CONTENT_ID="$1"
STAGE="$2"
FORCE_RUN="${3:-false}"  # true if start_stage matches current stage

# If force run via start_stage, always execute
if [ "$FORCE_RUN" == "true" ]; then
  echo "Force run enabled via start_stage parameter"
  echo "SKIP_STAGE=false" >> $GITHUB_OUTPUT
  exit 0
fi

check_translation_complete() {
  # Must verify: status >= 'translated' AND all 3 languages exist
  STATUS=$(curl -s "${SUPABASE_URL}/rest/v1/content?id=eq.$CONTENT_ID&language=eq.zh-TW&select=status" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" | jq -r '.[0].status // "none"')

  LANG_COUNT=$(curl -s "${SUPABASE_URL}/rest/v1/content?id=eq.$CONTENT_ID&select=language" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" | jq 'length')

  if [[ "$STATUS" =~ ^(translated|wav|m3u8|cloudflare|content|social)$ ]] && [ "$LANG_COUNT" -eq 3 ]; then
    echo "✅ Translation complete: status=$STATUS, languages=$LANG_COUNT"
    echo "SKIP_STAGE=true" >> $GITHUB_OUTPUT
  else
    echo "▶️  Translation needed: status=$STATUS, languages=$LANG_COUNT"
    echo "SKIP_STAGE=false" >> $GITHUB_OUTPUT
  fi
}

check_audio_complete() {
  # Check source language (zh-TW) status - this is what the pipeline updates
  STATUS=$(curl -s "${SUPABASE_URL}/rest/v1/content?id=eq.$CONTENT_ID&language=eq.zh-TW&select=status" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" | jq -r '.[0].status // "none"')

  if [[ "$STATUS" =~ ^(wav|m3u8|cloudflare|content|social)$ ]]; then
    echo "✅ Audio generation complete (source status=$STATUS)"
    echo "SKIP_STAGE=true" >> $GITHUB_OUTPUT
  else
    echo "▶️  Audio generation needed (source status=$STATUS)"
    echo "SKIP_STAGE=false" >> $GITHUB_OUTPUT
  fi
}

check_m3u8_complete() {
  # Check source language (zh-TW) status - this is what the pipeline updates
  STATUS=$(curl -s "${SUPABASE_URL}/rest/v1/content?id=eq.$CONTENT_ID&language=eq.zh-TW&select=status" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" | jq -r '.[0].status // "none"')

  if [[ "$STATUS" =~ ^(m3u8|cloudflare|content|social)$ ]]; then
    echo "✅ M3U8 conversion complete (source status=$STATUS)"
    echo "SKIP_STAGE=true" >> $GITHUB_OUTPUT
  else
    echo "▶️  M3U8 conversion needed (source status=$STATUS)"
    echo "SKIP_STAGE=false" >> $GITHUB_OUTPUT
  fi
}

check_cloudflare_complete() {
  # Check source language (zh-TW) status - this is what the pipeline updates
  STATUS=$(curl -s "${SUPABASE_URL}/rest/v1/content?id=eq.$CONTENT_ID&language=eq.zh-TW&select=status" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" | jq -r '.[0].status // "none"')

  if [[ "$STATUS" =~ ^(cloudflare|content|social)$ ]]; then
    echo "✅ Cloudflare upload complete (source status=$STATUS)"
    echo "SKIP_STAGE=true" >> $GITHUB_OUTPUT
  else
    echo "▶️  Cloudflare upload needed (source status=$STATUS)"
    echo "SKIP_STAGE=false" >> $GITHUB_OUTPUT
  fi
}

check_content_upload_complete() {
  # Check source language (zh-TW) status - this is what the pipeline updates
  STATUS=$(curl -s "${SUPABASE_URL}/rest/v1/content?id=eq.$CONTENT_ID&language=eq.zh-TW&select=status" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" | jq -r '.[0].status // "none"')

  if [[ "$STATUS" =~ ^(content|social)$ ]]; then
    echo "✅ Content upload complete (source status=$STATUS)"
    echo "SKIP_STAGE=true" >> $GITHUB_OUTPUT
  else
    echo "▶️  Content upload needed (source status=$STATUS)"
    echo "SKIP_STAGE=false" >> $GITHUB_OUTPUT
  fi
}

case "$STAGE" in
  translate) check_translation_complete ;;
  audio) check_audio_complete ;;
  m3u8) check_m3u8_complete ;;
  cloudflare) check_cloudflare_complete ;;
  content-upload) check_content_upload_complete ;;
  *)
    echo "❌ Unknown stage: $STAGE"
    echo "SKIP_STAGE=false" >> $GITHUB_OUTPUT
    ;;
esac
