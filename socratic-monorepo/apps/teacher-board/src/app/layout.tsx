import type { Metadata } from 'next';
import './globals.css';

/** Địa chỉ Render (rỗng khi chạy cục bộ). Nối sớm + gọi /ping ngay khi HTML được phân tích: máy chủ ngủ bắt đầu thức dậy SONG SONG với việc tải gói JS thay vì sau đó. */
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
const WARM = BACKEND && `fetch(${JSON.stringify(`${BACKEND}/ping`)},{mode:'no-cors',keepalive:true}).catch(function(){})`;

export const metadata: Metadata = {
  title: 'Socratic Vision Board - Teacher Smartboard',
  description: 'AI-assisted Interactive Smartboard with On-Demand Magic Lasso & 60FPS Deterministic Simulation Engines',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        {BACKEND ? (
          <>
            <link rel="preconnect" href={BACKEND} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={BACKEND} />
            <script dangerouslySetInnerHTML={{__html: WARM}} />
          </>
        ) : null}
      </head>
      <body className="bg-[#F8F7F4] text-[#18181B] min-h-screen antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
