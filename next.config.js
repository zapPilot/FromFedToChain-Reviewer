/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable image optimization for Fly.io deployment
  images: {
    unoptimized: false,
  },
};

module.exports = nextConfig;
