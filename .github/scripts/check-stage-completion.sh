#!/bin/bash
set -e

CONTENT_ID="$1"
STAGE="$2"
FORCE_RUN="${3:-false}"  # true if start_stage matches current stage

# Helper function to safely extract status from Supabase response
# Handles both array responses and error objects
get_source_status() {
  local response
  response=$(curl -s "${SUPABASE_URL}/rest/v1/content?id=eq.$CONTENT_ID&language=eq.zh-TW&select=status" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}")
  
  # Debug: show raw response
  echo "Debug: API response: $response" >&2
  
  # Check if response is an array with at least one element
  local is_array
  is_array=$(echo "$response" | jq 'if type == "array" then true else false end')
  
  if [ "$is_array" = "true" ]; then
    local length
    length=$(echo "$response" | jq 'length')
    if [ "$length" -gt 0 ]; then
      echo "$response" | jq -r '.[0].status // "none"'
    else
      echo "none"
    fi
  else
    # Response is an error object or unexpected format
    echo "Error: Unexpected API response format" >&2
    echo "none"
  fi
}

# If force run via start_stage, always execute
if [ "$FORCE_RUN" == "true" ]; then
  echo "Force run enabled via start_stage parameter"
  echo "SKIP_STAGE=false" >> $GITHUB_OUTPUT
  exit 0
fi

check_translation_complete() {
  # Must verify: status >= 'translated' AND all 3 languages exist
  STATUS=$(get_source_status)

  LANG_COUNT=$(curl -s "${SUPABASE_URL}/rest/v1/content?id=eq.$CONTENT_ID&select=language" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" | jq 'if type == "array" then length else 0 end')

  if [[ "$STATUS" =~ ^(translated|wav|m3u8|cloudflare|content|social)$ ]] && [ "$LANG_COUNT" -eq 3 ]; then
    echo "✅ Translation complete: status=$STATUS, languages=$LANG_COUNT"
    echo "SKIP_STAGE=true" >> $GITHUB_OUTPUT
  else
    echo "▶️  Translation needed: status=$STATUS, languages=$LANG_COUNT"
    echo "SKIP_STAGE=false" >> $GITHUB_OUTPUT
  fi
}

check_audio_complete() {
  STATUS=$(get_source_status)

  if [[ "$STATUS" =~ ^(wav|m3u8|cloudflare|content|social)$ ]]; then
    echo "✅ Audio generation complete (source status=$STATUS)"
    echo "SKIP_STAGE=true" >> $GITHUB_OUTPUT
  else
    echo "▶️  Audio generation needed (source status=$STATUS)"
    echo "SKIP_STAGE=false" >> $GITHUB_OUTPUT
  fi
}

check_m3u8_complete() {
  STATUS=$(get_source_status)

  if [[ "$STATUS" =~ ^(m3u8|cloudflare|content|social)$ ]]; then
    echo "✅ M3U8 conversion complete (source status=$STATUS)"
    echo "SKIP_STAGE=true" >> $GITHUB_OUTPUT
  else
    echo "▶️  M3U8 conversion needed (source status=$STATUS)"
    echo "SKIP_STAGE=false" >> $GITHUB_OUTPUT
  fi
}

check_cloudflare_complete() {
  STATUS=$(get_source_status)

  if [[ "$STATUS" =~ ^(cloudflare|content|social)$ ]]; then
    echo "✅ Cloudflare upload complete (source status=$STATUS)"
    echo "SKIP_STAGE=true" >> $GITHUB_OUTPUT
  else
    echo "▶️  Cloudflare upload needed (source status=$STATUS)"
    echo "SKIP_STAGE=false" >> $GITHUB_OUTPUT
  fi
}

check_content_upload_complete() {
  STATUS=$(get_source_status)

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

