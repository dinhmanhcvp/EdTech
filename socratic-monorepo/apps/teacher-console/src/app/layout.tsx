import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trang quản lý giáo viên – Socratic Vision Board',
  description: 'Quản lý lớp, soạn bài và điều khiển tiết học trên bảng thông minh, tách riêng khỏi màn hình chiếu.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
