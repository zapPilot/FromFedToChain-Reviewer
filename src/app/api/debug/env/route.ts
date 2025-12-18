import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    GITHUB_TOKEN: process.env.GITHUB_TOKEN
      ? `${process.env.GITHUB_TOKEN.slice(0, 10)}...` // Only show first 10 chars
      : 'NOT SET',
    NEXT_PUBLIC_GITHUB_OWNER: process.env.NEXT_PUBLIC_GITHUB_OWNER || 'NOT SET',
    NEXT_PUBLIC_GITHUB_REPO: process.env.NEXT_PUBLIC_GITHUB_REPO || 'NOT SET',
  });
}
