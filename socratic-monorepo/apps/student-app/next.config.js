/** @type {import('next').NextConfig} */
const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

module.exports = {
  reactStrictMode: false,
  transpilePackages: ['@socratic/types', '@socratic/ui'],
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '',
  },
  async rewrites() {
    return [{
      source: '/api/v1/:path*',
      destination: `${BACKEND_URL}/api/v1/:path*`,
    }];
  },
};
