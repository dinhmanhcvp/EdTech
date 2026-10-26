/** @type {import('next').NextConfig} */
// Địa chỉ máy chủ AI (FastAPI). Khi triển khai: đặt BACKEND_URL trên Vercel = địa chỉ dịch vụ Render, ví dụ https://socratic-ai-engine.onrender.com
const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@socratic/types', '@socratic/ui'],
  // Lớp học BYOD dùng WebSocket: Vercel không chuyển tiếp WebSocket, nên trình duyệt nối thẳng tới máy chủ AI.
  env: { NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '' },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      {
        source: '/health',
        destination: `${BACKEND_URL}/health`,
      },
    ];
  },
};


module.exports = nextConfig;
