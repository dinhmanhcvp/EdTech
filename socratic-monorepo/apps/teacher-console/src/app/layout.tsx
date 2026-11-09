import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trang quản lý giáo viên – Socratic Vision Board',
  description: 'Quản lý lớp, soạn bài và điều khiển tiết học trên bảng thông minh, tách riêng khỏi màn hình chiếu.',
};

// Newsreader (tiêu đề), Plus Jakarta Sans (giao diện), JetBrains Mono (số liệu): đều có tiếng Việt. Không tải được thì dùng phông dự phòng trong tailwind.config.js.
const FONTS =
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
