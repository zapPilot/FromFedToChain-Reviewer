/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Static export for GitHub Pages deployment
  // Only enable when explicitly requested to keep API routes working in dev
  output: process.env.NEXT_OUTPUT_EXPORT === 'true' ? 'export' : undefined,

  // GitHub Pages serves from /repo-name/ subdirectory
  // Update this if your repo name is different
  basePath: process.env.NODE_ENV === 'production' ? '/review-web' : '',

  // Ensure assets are served correctly from subdirectory
  assetPrefix: process.env.NODE_ENV === 'production' ? '/review-web/' : '',

  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
