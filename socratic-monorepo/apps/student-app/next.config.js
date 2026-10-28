/** @type {import('next').NextConfig} */
const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

// ---- Chặn lỗi triển khai ngay lúc build
if (process.env.VERCEL) {
  if (!process.env.BACKEND_URL) {
    throw new Error('Thiếu biến BACKEND_URL: đặt trong Vercel → Settings → Environment Variables = địa chỉ Render (https://....onrender.com).');
  }
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
    throw new Error('Không đặt khóa AI bằng biến NEXT_PUBLIC_* trên Vercel (khóa sẽ lộ cho mọi người). Đặt GEMINI_API_KEYS trên Render.');
  }
}

module.exports = {
  reactStrictMode: false,
  poweredByHeader: false,
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
