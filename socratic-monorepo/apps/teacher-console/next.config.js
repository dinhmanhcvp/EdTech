/** @type {import('next').NextConfig} */
// Trang quản lý giáo viên: ứng dụng riêng, tách khỏi bảng chiếu. Trình duyệt gọi THẲNG máy chủ AI (REST + WebSocket);
// địa chỉ lấy từ NEXT_PUBLIC_BACKEND_URL lúc build, hoặc ô "Địa chỉ máy chủ" trên trang đăng nhập (localStorage).
// Không đặt khóa AI hay bí mật nào bằng biến NEXT_PUBLIC_*: chúng bị nhúng vào mã gửi cho mọi người.
module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '',
    NEXT_PUBLIC_BOARD_URL: process.env.NEXT_PUBLIC_BOARD_URL || '',
  },
};
