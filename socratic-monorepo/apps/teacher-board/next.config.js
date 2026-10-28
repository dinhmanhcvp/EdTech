/** @type {import('next').NextConfig} */
// Địa chỉ máy chủ AI (FastAPI). Khi triển khai: đặt BACKEND_URL trên Vercel = địa chỉ dịch vụ Render, ví dụ https://socratic-ai-engine.onrender.com
const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

// ---- Chặn lỗi triển khai ngay lúc build (thay vì để bản web chạy sai âm thầm)
if (process.env.VERCEL) {
  if (!process.env.BACKEND_URL) {
    throw new Error('Thiếu biến BACKEND_URL: đặt trong Vercel → Settings → Environment Variables = địa chỉ Render (https://....onrender.com).');
  }
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
    // Biến NEXT_PUBLIC_* bị nhúng vào mã gửi cho MỌI người truy cập → lộ khóa. Khóa AI chỉ đặt trên Render.
    throw new Error('Không đặt khóa AI bằng biến NEXT_PUBLIC_* trên Vercel (khóa sẽ lộ cho mọi người). Đặt GEMINI_API_KEYS trên Render.');
  }
}

const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  transpilePackages: ['@socratic/types', '@socratic/ui'],
  // Trình duyệt gọi THẲNG máy chủ AI (một chặng, không qua proxy của Vercel, không bị giới hạn 30 giây của rewrite);
  // Lớp học BYOD dùng WebSocket nên bắt buộc nối thẳng (Vercel không chuyển tiếp WebSocket).
  env: { NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '' },
  // Rewrite chỉ còn là đường dự phòng khi gọi thẳng thất bại (ví dụ người dùng chặn tên miền lạ).
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
